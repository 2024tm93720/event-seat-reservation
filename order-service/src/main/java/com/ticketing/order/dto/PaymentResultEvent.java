package com.ticketing.order.dto;

import lombok.Data;

@Data
public class PaymentResultEvent {
    private Long orderId;
    private String paymentStatus;
    private String paymentReference;
}
