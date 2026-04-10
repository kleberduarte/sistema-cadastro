package com.sistema.cadastro.config;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.lang.NonNull;

/**
 * Com {@code spring.main.lazy-initialization=true}, o Hibernate pode inicializar antes do Flyway
 * e falhar em {@code ddl-auto=validate} (tabela ausente). Força o EMF a depender do bean que
 * executa {@code Flyway.migrate()}.
 * <p>
 * Implementa {@link Ordered#LOWEST_PRECEDENCE} para rodar depois que o auto-config do Flyway
 * registrou {@code flywayInitializer}.
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnClass(name = "org.flywaydb.core.Flyway")
public class FlywayBeforeJpaBeanPostProcessor implements BeanFactoryPostProcessor, Ordered {

    private static final String FLYWAY_INITIALIZER = "flywayInitializer";
    private static final String ENTITY_MANAGER_FACTORY = "entityManagerFactory";

    @Override
    public void postProcessBeanFactory(@NonNull ConfigurableListableBeanFactory beanFactory) throws BeansException {
        if (!(beanFactory instanceof BeanDefinitionRegistry registry)) {
            return;
        }
        if (!registry.containsBeanDefinition(ENTITY_MANAGER_FACTORY)
                || !registry.containsBeanDefinition(FLYWAY_INITIALIZER)) {
            return;
        }
        BeanDefinition emf = registry.getBeanDefinition(ENTITY_MANAGER_FACTORY);
        String[] deps = emf.getDependsOn();
        if (deps != null) {
            for (String d : deps) {
                if (FLYWAY_INITIALIZER.equals(d)) {
                    return;
                }
            }
        }
        if (deps == null || deps.length == 0) {
            emf.setDependsOn(FLYWAY_INITIALIZER);
            return;
        }
        String[] merged = new String[deps.length + 1];
        merged[0] = FLYWAY_INITIALIZER;
        System.arraycopy(deps, 0, merged, 1, deps.length);
        emf.setDependsOn(merged);
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
