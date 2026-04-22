package com.ticketing.payment.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
@Schema(description = "Paginated list of payments")
public class PagedPaymentResponse {

    @Schema(description = "Payment records on this page")
    private List<PaymentResponse> payments;

    @Schema(description = "Zero-based current page number", example = "0")
    private int page;

    @Schema(description = "Page size requested", example = "20")
    private int size;

    @Schema(description = "Total number of matching records", example = "400")
    private long totalElements;

    @Schema(description = "Total number of pages", example = "20")
    private int totalPages;

    @Schema(description = "Whether this is the first page", example = "true")
    private boolean first;

    @Schema(description = "Whether this is the last page", example = "false")
    private boolean last;
}
