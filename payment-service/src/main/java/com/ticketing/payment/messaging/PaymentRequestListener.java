package com.ticketing.payment.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticketing.payment.dto.PaymentRequestEvent;
import com.ticketing.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentRequestListener {

    private final PaymentService paymentService;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = "${app.rabbitmq.queue.payment-request}")
    public void onPaymentRequest(String message) {
        try {
            PaymentRequestEvent event = objectMapper.readValue(message, PaymentRequestEvent.class);
            log.info("Received payment request for order={} amount={}",
                    event.getOrderId(), event.getAmount());
            paymentService.processAsyncChargeRequest(event);
        } catch (Exception e) {
            log.error("Error processing payment request: {}", e.getMessage());
        }
    }
}
