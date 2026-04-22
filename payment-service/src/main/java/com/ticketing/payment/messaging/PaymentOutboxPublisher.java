package com.ticketing.payment.messaging;

import com.ticketing.payment.repository.PaymentOutboxRepository;
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
public class PaymentOutboxPublisher {

    private final PaymentOutboxRepository outboxRepo;
    private final RabbitTemplate rabbitTemplate;

    @Value("${app.rabbitmq.exchange}")
    private String exchange;

    @Value("${app.rabbitmq.routing-key.payment-result}")
    private String resultRoutingKey;

    @Scheduled(fixedDelay = 3000)
    @Transactional
    public void pollAndPublish() {
        outboxRepo.findByPublishedFalse().forEach(event -> {
            try {
                rabbitTemplate.convertAndSend(exchange, resultRoutingKey, event.getPayload());
                event.setPublished(true);
                outboxRepo.save(event);
                log.debug("Published payment outbox event {}", event.getOutboxId());
            } catch (Exception ex) {
                log.error("Failed to publish payment event {}: {}", event.getOutboxId(), ex.getMessage());
            }
        });
    }
}
