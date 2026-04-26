package com.ticketing.payment.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class PaymentRequestEvent {
    private Long orderId;
    private BigDecimal amount;
    private Long userId;
}
