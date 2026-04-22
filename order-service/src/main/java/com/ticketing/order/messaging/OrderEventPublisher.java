package com.ticketing.order.messaging;

import com.ticketing.order.repository.OrderOutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventPublisher {

    private final OrderOutboxRepository outboxRepo;
    private final RabbitTemplate rabbitTemplate;

    @Value("${app.rabbitmq.exchange}")
    private String exchange;

    @Value("${app.rabbitmq.routing-key.payment-request}")
    private String paymentRequestKey;

    @Value("${app.rabbitmq.routing-key.order-events}")
    private String orderEventsKey;

    @Scheduled(fixedDelay = 3000)
    @Transactional
    public void pollAndPublish() {
        outboxRepo.findByPublishedFalse().forEach(event -> {
            String routingKey = "ORDER_PLACED".equals(event.getEventType())
                    ? paymentRequestKey
                    : orderEventsKey;
            try {
                rabbitTemplate.convertAndSend(exchange, routingKey, event.getPayload());
                event.setPublished(true);
                outboxRepo.save(event);
                log.debug("Published outbox event {} type={}", event.getOutboxId(), event.getEventType());
            } catch (Exception ex) {
                log.error("Failed to publish outbox event {}: {}", event.getOutboxId(), ex.getMessage());
            }
        });
    }
}
