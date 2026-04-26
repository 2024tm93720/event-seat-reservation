package com.ticketing.payment.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Schema(description = "Request body for initiating a refund on a successful payment")
public class RefundRequest {

    @NotNull
    @Schema(description = "ID of the payment to refund", example = "7")
    private Long paymentId;

    @NotNull
    @DecimalMin("0.01")
    @Schema(description = "Amount to refund — cannot exceed the original payment amount", example = "1574.21")
    private BigDecimal refundAmount;

    @Schema(description = "Optional reason for the refund", example = "Customer requested cancellation")
    private String reason;
}
