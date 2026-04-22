package com.ticketing.order.controller;

import com.ticketing.order.dto.OrderResponse;
import com.ticketing.order.dto.OrderStatsResponse;
import com.ticketing.order.dto.PagedOrderResponse;
import com.ticketing.order.dto.PlaceOrderRequest;
import com.ticketing.order.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "Place, confirm, retrieve, and cancel orders")
public class OrderController {

    private final OrderService orderService;

    @Operation(summary = "Get aggregate order statistics")
    @ApiResponse(responseCode = "200", description = "Counts by status and total tickets")
    @GetMapping("/stats")
    public ResponseEntity<OrderStatsResponse> getStats() {
        return ResponseEntity.ok(orderService.getStats());
    }

    @Operation(summary = "Place a new order",
               description = "Reserves seats and calculates totals (seat prices + 5% tax). Idempotent when idempotencyKey is supplied.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Order created with RESERVED status"),
            @ApiResponse(responseCode = "400", description = "Invalid request body"),
            @ApiResponse(responseCode = "409", description = "Duplicate idempotency key")
    })
    @PostMapping
    public ResponseEntity<OrderResponse> placeOrder(
            @Valid @RequestBody PlaceOrderRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.placeOrder(req));
    }

    @Operation(summary = "Confirm a reserved order",
               description = "Transitions the order from RESERVED → CONFIRMED and generates one ticket per seat.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Order confirmed and tickets issued"),
            @ApiResponse(responseCode = "400", description = "Order is not in RESERVED state"),
            @ApiResponse(responseCode = "404", description = "Order not found")
    })
    @PostMapping("/{id}/confirm")
    public ResponseEntity<OrderResponse> confirmOrder(
            @Parameter(description = "Order ID") @PathVariable Long id) {
        return ResponseEntity.ok(orderService.confirmOrder(id));
    }

    @Operation(summary = "Get order by ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Order found"),
            @ApiResponse(responseCode = "404", description = "Order not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrder(
            @Parameter(description = "Order ID") @PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrder(id));
    }

    @Operation(summary = "List orders for a user")
    @ApiResponse(responseCode = "200", description = "List of orders (may be empty)")
    @GetMapping
    public ResponseEntity<List<OrderResponse>> getOrdersByUser(
            @Parameter(description = "User ID", required = true) @RequestParam Long userId) {
        return ResponseEntity.ok(orderService.getOrdersByUser(userId));
    }

    @Operation(summary = "List all orders (paginated)",
               description = "Returns a paginated list of all orders. Optional status filter: PENDING, RESERVED, CONFIRMED, PAYMENT_FAILED, CANCELLED, REJECTED.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Paginated order list"),
            @ApiResponse(responseCode = "400", description = "Invalid status value")
    })
    @GetMapping("/all")
    public ResponseEntity<PagedOrderResponse> getAllOrders(
            @Parameter(description = "Filter by order status (optional)") @RequestParam(required = false) String status,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(orderService.getAllOrders(status, page, size));
    }

    @Operation(summary = "Cancel an order",
               description = "Only PENDING or RESERVED orders can be cancelled. CONFIRMED orders require a refund.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Order cancelled"),
            @ApiResponse(responseCode = "400", description = "Order cannot be cancelled"),
            @ApiResponse(responseCode = "404", description = "Order not found")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<OrderResponse> cancelOrder(
            @Parameter(description = "Order ID") @PathVariable Long id) {
        return ResponseEntity.ok(orderService.cancelOrder(id));
    }
}
