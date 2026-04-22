package com.ticketing.order.dto;

import com.ticketing.order.model.OrderStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
@Schema(description = "Order details returned after creation or retrieval")
public class OrderResponse {

    @Schema(description = "Unique order ID", example = "1001")
    private Long orderId;

    @Schema(description = "User who placed the order", example = "42")
    private Long userId;

    @Schema(description = "Event the order is for", example = "7")
    private Long eventId;

    @Schema(description = "Number of seats reserved", example = "2")
    private int seatCount;

    @Schema(description = "Subtotal before tax", example = "200.00")
    private BigDecimal subtotal;

    @Schema(description = "Tax amount (5%)", example = "10.00")
    private BigDecimal taxAmount;

    @Schema(description = "Total amount charged", example = "210.00")
    private BigDecimal orderTotal;

    @Schema(description = "Current order status", example = "CONFIRMED")
    private OrderStatus orderStatus;

    @Schema(description = "Seats included in this order")
    private List<OrderSeatDto> seats;

    @Schema(description = "Tickets issued after payment confirmation")
    private List<TicketDto> tickets;

    @Schema(description = "Timestamp when the order was created")
    private Instant createdAt;
}
