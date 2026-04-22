package com.ticketing.order.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@Schema(description = "Paginated list of orders")
public class PagedOrderResponse {

    private List<OrderResponse> orders;

    @Schema(example = "0")
    private int page;

    @Schema(example = "20")
    private int size;

    @Schema(example = "400")
    private long totalElements;

    @Schema(example = "20")
    private int totalPages;

    @Schema(example = "true")
    private boolean first;

    @Schema(example = "false")
    private boolean last;
}
