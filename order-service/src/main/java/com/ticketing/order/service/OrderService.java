package com.ticketing.order.service;

import com.ticketing.order.dto.*;
import com.ticketing.order.model.*;
import com.ticketing.order.model.OrderStatus;
import com.ticketing.order.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private static final BigDecimal TAX_RATE = new BigDecimal("0.05");

    private final OrderRepository orderRepo;
    private final TicketRepository ticketRepo;
    private final OrderOutboxRepository outboxRepo;

    // ── Place Order ───────────────────────────────────────────────────────────
    // Accepts seat details (including prices) in the request, calculates totals
    // with 5% tax, persists the order as RESERVED, and writes an outbox event.
    @Transactional
    public OrderResponse placeOrder(PlaceOrderRequest req) {
        if (req.getIdempotencyKey() != null) {
            var existing = orderRepo.findByIdempotencyKey(req.getIdempotencyKey());
            if (existing.isPresent()) {
                log.info("Duplicate order request for key={}", req.getIdempotencyKey());
                return toResponse(existing.get());
            }
        }

        List<SeatItemRequest> seats = req.getSeats();

        BigDecimal subtotal = seats.stream()
                .map(SeatItemRequest::getSeatPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal tax   = subtotal.multiply(TAX_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(tax).setScale(2, RoundingMode.HALF_UP);

        Order order = Order.builder()
                .userId(req.getUserId())
                .eventId(req.getEventId())
                .seatCount(seats.size())
                .subtotal(subtotal)
                .taxAmount(tax)
                .orderTotal(total)
                .orderStatus(OrderStatus.RESERVED)
                .idempotencyKey(req.getIdempotencyKey() != null
                        ? req.getIdempotencyKey()
                        : UUID.randomUUID().toString())
                .build();

        seats.forEach(s -> order.getSeats().add(
                OrderSeat.builder()
                        .order(order)
                        .seatId(s.getSeatId())
                        .seatLabel(s.getSeatLabel())
                        .section(s.getSection())
                        .seatPrice(s.getSeatPrice())
                        .build()
        ));

        orderRepo.save(order);

        publishToOutbox(order.getOrderId(), "ORDER_PLACED",
                String.format("{\"orderId\":%d,\"amount\":%s,\"userId\":%d}",
                        order.getOrderId(), total, req.getUserId()));

        log.info("Order {} placed — user={} event={} seats={} subtotal={} tax={} total={}",
                order.getOrderId(), req.getUserId(), req.getEventId(),
                seats.size(), subtotal, tax, total);
        return toResponse(order);
    }

    // ── Confirm Order ─────────────────────────────────────────────────────────
    // Transitions a RESERVED order to CONFIRMED and generates one ticket per
    // seat. In the full architecture this is triggered by the Payment Service
    // via RabbitMQ; this endpoint allows direct confirmation for testing /
    // internal use.
    @Transactional
    public OrderResponse confirmOrder(Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        if (order.getOrderStatus() != OrderStatus.RESERVED) {
            throw new IllegalStateException(
                    "Only RESERVED orders can be confirmed. Current status: " + order.getOrderStatus());
        }

        order.setOrderStatus(OrderStatus.CONFIRMED);
        generateTickets(order);
        orderRepo.save(order);

        publishToOutbox(orderId, "ORDER_CONFIRMED",
                "{\"orderId\":" + orderId + "}");

        log.info("Order {} confirmed — {} ticket(s) generated", orderId, order.getTickets().size());
        return toResponse(order);
    }

    // ── Cancel Order ──────────────────────────────────────────────────────────
    @Transactional
    public OrderResponse cancelOrder(Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        if (order.getOrderStatus() == OrderStatus.CONFIRMED) {
            throw new IllegalStateException("Cannot cancel a confirmed order; request a refund.");
        }
        if (order.getOrderStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Order is already cancelled.");
        }

        order.setOrderStatus(OrderStatus.CANCELLED);
        cancelTickets(order);
        orderRepo.save(order);

        log.info("Order {} cancelled", orderId);
        return toResponse(order);
    }

    // ── Queries ───────────────────────────────────────────────────────────────
    public OrderResponse getOrder(Long orderId) {
        return toResponse(orderRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId)));
    }

    public List<OrderResponse> getOrdersByUser(Long userId) {
        return orderRepo.findByUserId(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public PagedOrderResponse getAllOrders(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Order> result = (status != null && !status.isBlank())
                ? orderRepo.findByOrderStatus(OrderStatus.valueOf(status.toUpperCase()), pageable)
                : orderRepo.findAll(pageable);
        return PagedOrderResponse.builder()
                .orders(result.getContent().stream().map(this::toResponse).collect(Collectors.toList()))
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .first(result.isFirst())
                .last(result.isLast())
                .build();
    }

    public OrderStatsResponse getStats() {
        return OrderStatsResponse.builder()
                .total(orderRepo.count())
                .confirmed(orderRepo.countByOrderStatus(OrderStatus.CONFIRMED))
                .reserved(orderRepo.countByOrderStatus(OrderStatus.RESERVED))
                .paymentFailed(orderRepo.countByOrderStatus(OrderStatus.PAYMENT_FAILED))
                .rejected(orderRepo.countByOrderStatus(OrderStatus.REJECTED))
                .cancelled(orderRepo.countByOrderStatus(OrderStatus.CANCELLED))
                .totalTickets(ticketRepo.count())
                .build();
    }

    // ── Payment result (async, from RabbitMQ) ────────────────────────────────
    @Transactional
    public void handlePaymentResult(PaymentResultEvent event) {
        Order order = orderRepo.findById(event.getOrderId())
                .orElseThrow(() -> new IllegalStateException("Order not found: " + event.getOrderId()));

        switch (event.getPaymentStatus()) {
            case "SUCCESS" -> {
                order.setOrderStatus(OrderStatus.CONFIRMED);
                generateTickets(order);
                publishToOutbox(order.getOrderId(), "ORDER_CONFIRMED",
                        "{\"orderId\":" + order.getOrderId() + "}");
            }
            case "FAILED" -> {
                order.setOrderStatus(OrderStatus.PAYMENT_FAILED);
                publishToOutbox(order.getOrderId(), "ORDER_PAYMENT_FAILED",
                        "{\"orderId\":" + order.getOrderId() + "}");
            }
            case "REFUNDED" -> {
                order.setOrderStatus(OrderStatus.CANCELLED);
                cancelTickets(order);
            }
        }
        orderRepo.save(order);
    }

    // ── Private helpers ───────────────────────────────────────────────────────
    private void generateTickets(Order order) {
        order.getSeats().forEach(seat -> {
            String code = "TKT-" + System.currentTimeMillis()
                    + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            Ticket ticket = Ticket.builder()
                    .order(order)
                    .seatId(seat.getSeatId())
                    .ticketCode(code)
                    .ticketStatus(TicketStatus.ISSUED)
                    .build();
            order.getTickets().add(ticket);
        });
    }

    private void cancelTickets(Order order) {
        order.getTickets().forEach(t -> t.setTicketStatus(TicketStatus.CANCELLED));
    }

    private void publishToOutbox(Long orderId, String eventType, String payload) {
        outboxRepo.save(OrderOutbox.builder()
                .aggregateId(orderId)
                .eventType(eventType)
                .payload(payload)
                .published(false)
                .build());
    }

    private OrderResponse toResponse(Order o) {
        List<OrderSeatDto> seatDtos = o.getSeats().stream()
                .map(s -> OrderSeatDto.builder()
                        .seatId(s.getSeatId())
                        .seatLabel(s.getSeatLabel())
                        .section(s.getSection())
                        .seatPrice(s.getSeatPrice())
                        .build())
                .collect(Collectors.toList());

        List<TicketDto> ticketDtos = o.getTickets().stream()
                .map(t -> TicketDto.builder()
                        .ticketId(t.getTicketId())
                        .seatId(t.getSeatId())
                        .ticketCode(t.getTicketCode())
                        .ticketStatus(t.getTicketStatus())
                        .issuedAt(t.getIssuedAt())
                        .build())
                .collect(Collectors.toList());

        return OrderResponse.builder()
                .orderId(o.getOrderId())
                .userId(o.getUserId())
                .eventId(o.getEventId())
                .seatCount(o.getSeatCount())
                .subtotal(o.getSubtotal())
                .taxAmount(o.getTaxAmount())
                .orderTotal(o.getOrderTotal())
                .orderStatus(o.getOrderStatus())
                .seats(seatDtos)
                .tickets(ticketDtos)
                .createdAt(o.getCreatedAt())
                .build();
    }
}
