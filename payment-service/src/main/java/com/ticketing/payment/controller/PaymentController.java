package com.ticketing.payment.controller;

import com.ticketing.payment.dto.*;
import com.ticketing.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Charge, refund, retrieve, and inspect payments")
public class PaymentController {

    private final PaymentService paymentService;

    // ── Stats ────────────────────────────────────────────────────

    @GetMapping("/stats")
    @Operation(
        summary = "Payment statistics",
        description = "Returns aggregate counts and total revenue across all payment records"
    )
    @ApiResponse(responseCode = "200", description = "Stats retrieved successfully")
    public ResponseEntity<PaymentStatsResponse> getStats() {
        return ResponseEntity.ok(paymentService.getStats());
    }

    // ── List all (paginated) ────────────────────────────────────

    @GetMapping("/all")
    @Operation(
        summary = "List all payments",
        description = "Returns a paginated list of payments, optionally filtered by status. "
                    + "Results are ordered by creation time descending."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Page returned successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid status value or pagination params",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<PagedPaymentResponse> getAllPayments(
            @Parameter(description = "Filter by status: SUCCESS | FAILED | PENDING | REFUNDED")
            @RequestParam(required = false) String status,
            @Parameter(description = "Zero-based page number", example = "0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size (max 100)", example = "20")
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(paymentService.getAllPayments(status, page, size));
    }

    // ── Charge ───────────────────────────────────────────────────

    @PostMapping("/charge")
    @Operation(
        summary = "Charge a payment",
        description = "Processes a payment for the given order. Supply a unique Idempotency-Key "
                    + "header to safely retry without double-charging."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Payment processed (check status field for SUCCESS/FAILED)"),
        @ApiResponse(responseCode = "400", description = "Validation error or missing Idempotency-Key header",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<PaymentResponse> charge(
            @Parameter(description = "Client-supplied unique key to prevent duplicate charges", required = true)
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody ChargeRequest req) {
        req.setIdempotencyKey(idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.charge(req));
    }

    // ── Refund ───────────────────────────────────────────────────

    @PostMapping("/refund")
    @Operation(
        summary = "Refund a payment",
        description = "Initiates a refund for a previously successful payment. "
                    + "Partial refunds are supported — refundAmount must not exceed the original amount."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Refund processed; payment status set to REFUNDED"),
        @ApiResponse(responseCode = "400", description = "Validation error or refund amount exceeds original",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "404", description = "Payment not found",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "409", description = "Payment is not in SUCCESS state",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<PaymentResponse> refund(
            @Valid @RequestBody RefundRequest req) {
        return ResponseEntity.ok(paymentService.refund(req));
    }

    // ── Lookups ──────────────────────────────────────────────────

    @GetMapping("/{id}")
    @Operation(summary = "Get payment by ID")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Payment found"),
        @ApiResponse(responseCode = "404", description = "Payment not found",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<PaymentResponse> getById(
            @Parameter(description = "Payment ID", required = true, example = "7")
            @PathVariable Long id) {
        return ResponseEntity.ok(paymentService.getById(id));
    }

    @GetMapping("/order/{orderId}")
    @Operation(summary = "Get payment by order ID")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Payment found"),
        @ApiResponse(responseCode = "404", description = "No payment exists for the given order",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<PaymentResponse> getByOrder(
            @Parameter(description = "Order ID", required = true, example = "42")
            @PathVariable Long orderId) {
        return ResponseEntity.ok(paymentService.getByOrderId(orderId));
    }
}
