package com.ticketing.order.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "Request body for placing a new order")
public class PlaceOrderRequest {

    @NotNull
    @Schema(description = "ID of the user placing the order", example = "42")
    private Long userId;

    @NotNull
    @Schema(description = "ID of the event", example = "7")
    private Long eventId;

    @NotEmpty
    @Valid
    @Schema(description = "Seats to reserve — each entry carries its price so no external call is needed")
    private List<SeatItemRequest> seats;

    @Schema(description = "Optional idempotency key to prevent duplicate submissions", example = "order-uuid-abc123")
    private String idempotencyKey;
}
