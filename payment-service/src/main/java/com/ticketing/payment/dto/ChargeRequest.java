package com.ticketing.payment.dto;

import com.ticketing.payment.model.PaymentMethod;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Schema(description = "Request body for charging a payment against an order")
public class ChargeRequest {

    @NotNull
    @Schema(description = "ID of the order being paid", example = "42")
    private Long orderId;

    @NotNull
    @DecimalMin("0.01")
    @Schema(description = "Amount to charge (must be > 0)", example = "1574.21")
    private BigDecimal amount;

    @NotNull
    @Schema(description = "Payment method to use", example = "UPI")
    private PaymentMethod method;

    @NotBlank
    @Schema(description = "Client-supplied idempotency key — prevents duplicate charges on retry", example = "order-42-attempt-1")
    private String idempotencyKey;
}
