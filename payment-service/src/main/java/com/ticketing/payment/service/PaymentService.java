package com.ticketing.payment.service;

import com.ticketing.payment.dto.*;
import com.ticketing.payment.model.*;
import com.ticketing.payment.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepo;
    private final RefundRepository refundRepo;
    private final PaymentOutboxRepository outboxRepo;

    @Transactional
    public PaymentResponse charge(ChargeRequest req) {
        var existing = paymentRepo.findByIdempotencyKey(req.getIdempotencyKey());
        if (existing.isPresent()) {
            log.info("Duplicate charge request for idempotencyKey={}", req.getIdempotencyKey());
            return toResponse(existing.get());
        }

        String reference = "PAY" + Instant.now().toEpochMilli() + "-"
                + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        boolean gatewaySuccess = simulateGateway(req.getAmount(), req.getMethod());
        PaymentStatus status = gatewaySuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
        String failureReason = gatewaySuccess ? null : "Gateway declined the transaction";

        Payment payment = Payment.builder()
                .orderId(req.getOrderId())
                .amount(req.getAmount())
                .method(req.getMethod())
                .status(status)
                .reference(reference)
                .idempotencyKey(req.getIdempotencyKey())
                .failureReason(failureReason)
                .gatewayResponse("{\"simulated\":true,\"success\":" + gatewaySuccess + "}")
                .build();

        paymentRepo.save(payment);

        String eventType = gatewaySuccess ? "PAYMENT_SUCCESS" : "PAYMENT_FAILED";
        outboxRepo.save(PaymentOutbox.builder()
                .aggregateId(payment.getPaymentId())
                .eventType(eventType)
                .payload(buildResultPayload(req.getOrderId(), status.name(), reference))
                .published(false)
                .build());

        log.info("Payment {} for order={} status={}", reference, req.getOrderId(), status);
        return toResponse(payment);
    }

    @Transactional
    public PaymentResponse refund(RefundRequest req) {
        Payment payment = paymentRepo.findById(req.getPaymentId())
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + req.getPaymentId()));

        if (payment.getStatus() != PaymentStatus.SUCCESS) {
            throw new IllegalStateException("Only SUCCESS payments can be refunded");
        }
        if (req.getRefundAmount().compareTo(payment.getAmount()) > 0) {
            throw new IllegalArgumentException("Refund amount exceeds original payment");
        }

        String refundRef = "REF" + Instant.now().toEpochMilli() + "-"
                + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Refund refund = Refund.builder()
                .payment(payment)
                .refundAmount(req.getRefundAmount())
                .refundStatus(RefundStatus.COMPLETED)
                .reason(req.getReason())
                .refundRef(refundRef)
                .build();

        refundRepo.save(refund);
        payment.setStatus(PaymentStatus.REFUNDED);
        paymentRepo.save(payment);

        outboxRepo.save(PaymentOutbox.builder()
                .aggregateId(payment.getPaymentId())
                .eventType("PAYMENT_REFUNDED")
                .payload(buildResultPayload(payment.getOrderId(), "REFUNDED", refundRef))
                .published(false)
                .build());

        log.info("Refund {} for payment={} amount={}", refundRef, payment.getPaymentId(), req.getRefundAmount());
        return toResponse(payment);
    }

    public PaymentResponse getByOrderId(Long orderId) {
        return toResponse(paymentRepo.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("No payment for order: " + orderId)));
    }

    public PaymentResponse getById(Long paymentId) {
        return toResponse(paymentRepo.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentId)));
    }

    public PagedPaymentResponse getAllPayments(String status, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Payment> result = (status != null && !status.isBlank())
                ? paymentRepo.findByStatus(PaymentStatus.valueOf(status.toUpperCase()), pageable)
                : paymentRepo.findAll(pageable);

        return PagedPaymentResponse.builder()
                .payments(result.getContent().stream().map(this::toResponse).toList())
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .first(result.isFirst())
                .last(result.isLast())
                .build();
    }

    public PaymentStatsResponse getStats() {
        return PaymentStatsResponse.builder()
                .total(paymentRepo.count())
                .success(paymentRepo.countByStatus(PaymentStatus.SUCCESS))
                .failed(paymentRepo.countByStatus(PaymentStatus.FAILED))
                .pending(paymentRepo.countByStatus(PaymentStatus.PENDING))
                .refunded(paymentRepo.countByStatus(PaymentStatus.REFUNDED))
                .totalRevenue(paymentRepo.sumSuccessfulPayments())
                .build();
    }

    @Transactional
    public void processAsyncChargeRequest(PaymentRequestEvent event) {
        ChargeRequest req = new ChargeRequest();
        req.setOrderId(event.getOrderId());
        req.setAmount(event.getAmount());
        req.setMethod(PaymentMethod.UPI);
        req.setIdempotencyKey("ASYNC-" + event.getOrderId());
        charge(req);
    }

    /** Simulates a payment gateway. Returns true ~80% of the time. */
    private boolean simulateGateway(BigDecimal amount, PaymentMethod method) {
        return Math.random() > 0.2;
    }

    private String buildResultPayload(Long orderId, String status, String ref) {
        return String.format(
                "{\"orderId\":%d,\"paymentStatus\":\"%s\",\"paymentReference\":\"%s\"}",
                orderId, status, ref);
    }

    private PaymentResponse toResponse(Payment p) {
        return PaymentResponse.builder()
                .paymentId(p.getPaymentId())
                .orderId(p.getOrderId())
                .amount(p.getAmount())
                .method(p.getMethod())
                .status(p.getStatus())
                .reference(p.getReference())
                .failureReason(p.getFailureReason())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
