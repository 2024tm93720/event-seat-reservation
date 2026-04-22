package com.ticketing.order.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticketing.order.dto.PaymentResultEvent;
import com.ticketing.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentResultListener {

    private final OrderService orderService;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = "${app.rabbitmq.routing-key.payment-request}.result")
    public void onPaymentResult(String message) {
        try {
            PaymentResultEvent event = objectMapper.readValue(message, PaymentResultEvent.class);
            log.info("Received payment result for order={} status={}",
                    event.getOrderId(), event.getPaymentStatus());
            orderService.handlePaymentResult(event);
        } catch (Exception e) {
            log.error("Error processing payment result: {}", e.getMessage());
        }
    }
}
