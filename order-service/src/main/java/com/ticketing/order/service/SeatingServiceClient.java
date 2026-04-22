package com.ticketing.order.service;

import com.ticketing.order.dto.SeatDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(name = "seating-service", url = "${app.seating-service-url}")
public interface SeatingServiceClient {

    @GetMapping("/v1/seats/details")
    List<SeatDto> getSeatDetails(@RequestParam("ids") List<Long> seatIds);
}
