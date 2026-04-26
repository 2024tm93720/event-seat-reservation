package com.ticketing.payment.dto;

import com.ticketing.payment.model.PaymentMethod;
import com.ticketing.payment.model.PaymentStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@Schema(description = "Payment details returned after a charge, refund, or lookup")
public class PaymentResponse {

    @Schema(description = "Unique payment ID", example = "7")
    private Long paymentId;

    @Schema(description = "Order this payment belongs to", example = "42")
    private Long orderId;

    @Schema(description = "Amount charged", example = "1574.21")
    private BigDecimal amount;

    @Schema(description = "Payment method used", example = "UPI")
    private PaymentMethod method;

    @Schema(description = "Current payment status", example = "SUCCESS")
    private PaymentStatus status;

    @Schema(description = "Unique payment reference number", example = "PAY20260407-1RT8ONFZ")
    private String reference;

    @Schema(description = "Gateway decline reason (null on success)", example = "Gateway declined the transaction")
    private String failureReason;

    @Schema(description = "Timestamp when the payment was created")
    private Instant createdAt;
}
