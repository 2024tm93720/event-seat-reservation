package com.ticketing.order.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "Seat details supplied at order time")
public class SeatItemRequest {

    @NotNull
    @Schema(description = "Seat ID from the Seating Service", example = "101")
    private Long seatId;

    @Schema(description = "Human-readable seat label", example = "A12")
    private String seatLabel;

    @Schema(description = "Section name", example = "VIP")
    private String section;

    @NotNull
    @DecimalMin("0.01")
    @Schema(description = "Price per seat (before tax)", example = "150.00")
    private BigDecimal seatPrice;
}
