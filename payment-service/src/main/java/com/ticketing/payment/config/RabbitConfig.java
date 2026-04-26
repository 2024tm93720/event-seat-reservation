package com.ticketing.payment.config;

import org.springframework.amqp.core.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    @Value("${app.rabbitmq.exchange}")
    private String exchange;

    @Bean
    public TopicExchange ticketingExchange() {
        return new TopicExchange(exchange, true, false);
    }

    @Bean
    public Queue paymentRequestQueue() {
        return QueueBuilder.durable("order.payment.request").build();
    }

    @Bean
    public Queue paymentResultQueue() {
        return QueueBuilder.durable("order.payment.request.result").build();
    }

    @Bean
    public Binding paymentRequestBinding() {
        return BindingBuilder.bind(paymentRequestQueue())
                .to(ticketingExchange()).with("order.payment.request");
    }

    @Bean
    public Binding paymentResultBinding() {
        return BindingBuilder.bind(paymentResultQueue())
                .to(ticketingExchange()).with("order.payment.request.result");
    }
}
