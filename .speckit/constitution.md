
# Tiny Store – Project Constitution

**Version:** 2.0  
**Last Updated:** 2025-11-22  

This constitution defines the governing principles and development guidelines for the Tiny Store project.  
All future specs, plans, tasks, and code must comply with these rules.

---

## 1. Project Overview

Tiny Store is an educational e-commerce backend built as a **modular monolith**.

It exists to demonstrate:

- Rich domain models with business logic
- Vertical slice (package by feature) architecture
- Event driven communication between bounded contexts
- A thin API layer that delegates to feature handlers

The primary business domains are:

- **Orders**
- **Inventory**
- **Payments**
- **Shipments**

These domains are modeled as separate modules with clear boundaries inside a single deployment unit.

---

## 2. Architecture Principles

1. **Modular Monolith**

   - Single deployable application.
   - Internal structure is modular, with explicit boundaries.
   - No microservice extraction is planned at this stage.

2. **Bounded Contexts as Modules**

   - Orders, Inventory, Payments, and Shipments are independent bounded contexts.
   - Each bounded context owns its domain model, persistence, and business rules.
   - Cross context behavior must go through domain events, not direct imports.

3. **Vertical Slice Architecture**

   - Organize code by **feature** inside each module, not by technical layer.
   - Each feature contains everything needed for its use case (handler, service, validation, tests).
   - Horizontal folders such as global `controllers/` or `services/` are not allowed.

4. **Rich Domain Model**

   - Domain entities contain behavior, not just data.
   - Business rules and invariants live in entities and value objects, not in controllers.
   - Anemic models (entities with only getters and setters) are considered an anti pattern.

---

## 3. Technology Constraints

1. **Runtime and Language**

   - The project uses **TypeScript** with strict type checking.
   - The runtime is **Node.js** with **Next.js App Router** for the HTTP layer.

2. **Monorepo and Build**

   - The project uses an **Nx** workspace.
   - Nx tags and dependency rules enforce module boundaries.
   - Shared concerns must live in explicit shared modules.

3. **Persistence**

   - Use **TypeORM** as the ORM.
   - Use an in memory or lightweight relational database for development and tests.
   - Each entity is owned by exactly one module.

4. **Messaging**

   - Use an **in process event bus** for domain events.
   - No external message broker is used at this stage.

---

## 4. Domain and Data Rules

1. **Ownership**

   - Each bounded context owns its entities, value objects, and repositories.
   - Other modules cannot persist or directly modify entities that they do not own.

2. **Boundaries**

   - Data sharing happens through domain events or read models, not shared entities.
   - Shared code is limited to cross cutting concerns (event bus, database config, errors, testing utilities).

3. **Naming**

   - Entities: `*.entity.ts`
   - Value Objects: `*.value-object.ts`
   - Repositories: `*.repository.ts`
   - Domain Events: `*.event.ts`
   - Event Listeners: `*.listener.ts`
   - Feature handlers and services follow a consistent `features/<feature-name>/` layout.

4. **Event Store**

   - Domain events may be persisted in an event store for audit and debugging.
   - The event store is append only.

---

## 5. Event Driven Communication

1. **Events as the Only Cross Module Mechanism**

   - Modules do not import each other directly for business logic.
   - Cross module behavior happens via published domain events and subscribed listeners.

2. **Event Design**

   - Events represent **facts that happened** in the past.
   - Events are immutable.
   - Event naming is in past tense, for example `OrderPlaced`, `PaymentProcessed`.

3. **Event Handling**

   - Event listeners are idempotent wherever possible.
   - Event handlers should remain small and focused.
   - Failures are logged and surfaced in a way that is easy to debug.

4. **Asynchronous by Default**

   - Domain events are processed asynchronously from the caller point of view.
   - Caller success is based on its own invariants, not on downstream modules.

---

## 6. API Layer Principles

1. **Thin HTTP Layer**

   - Next.js API routes are thin wrappers.
   - Routes delegate to feature handlers inside the owning module.

2. **Feature Handlers**

   - Each feature has its own `handler.ts` inside its feature folder.
   - Handler responsibilities:
     - Parse the request.
     - Validate input.
     - Call the appropriate service.
     - Map domain results or errors into HTTP responses.
   - Handlers **never** contain domain logic and do not access the database directly.

3. **Consistency**

   - Responses use a consistent envelope for both success and error cases.
   - HTTP status codes match the semantics of the operation and error type.

---

## 7. Testing and Quality Bar

1. **Testing Strategy**

   - Use a test pyramid:
     - Unit tests for domain entities and services.
     - Integration tests for event flows and persistence.
     - API or end to end tests for complete scenarios.

2. **Coverage and Feedback**

   - Target at least a reasonable level of coverage for critical domain logic.
   - Tests should execute fast enough to run frequently.

3. **Principles**

   - Test observable behavior, not private implementation details.
   - Prefer real domain interactions over extensive mocking inside a module.
   - External systems or side effects are mocked or faked at clear boundaries.

---

## 8. Development Workflow Guidelines

1. **Before Implementing a Feature**

   - Identify the primary bounded context that owns the feature.
   - Model or adjust the domain entities and value objects first.
   - Design the event interactions if other modules are affected.

2. **During Implementation**

   - Implement domain behavior in entities and value objects.
   - Add repositories for persistence.
   - Add a vertical slice in `features/` that uses the domain model.
   - Only then expose the feature through an HTTP route.

3. **After Implementation**

   - Add or update tests that cover the new behavior and event flows.
   - Ensure Nx lint and boundary checks pass.
   - Keep the implementation plan and documentation in sync with the actual design.

---

## 9. Evolution and Trade Offs

1. **Current Trade Offs**

   - A modular monolith is chosen for simplicity, speed of change, and ease of reasoning.
   - An in process event bus is sufficient for the educational scope of the project.
   - A lightweight database is accepted for local development and testing.

2. **When to Revisit Decisions**

   - If event volume, scale, or reliability constraints require an external broker.
   - If the database needs to persist and scale beyond the current setup.
   - If team size or complexity makes additional separation necessary.

Any change to these core trade offs must be recorded as an explicit architectural decision.

---

## 10. Use with Spec Kit

When using Spec Kit for this project:

- The **constitution** defines long lived rules and constraints.
- **Specs** describe individual features within one or more bounded contexts.
- **Plans** turn those specs into concrete implementation steps that must respect this constitution.
- **Tasks** are derived from plans and must not violate the principles defined here.

This document is stable and should change rarely.  
Only update it when you are adjusting long term architectural decisions, not individual features.
