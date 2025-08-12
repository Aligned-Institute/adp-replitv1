# ADP (Alignment Delegation Protocol) System

## Overview

This is a comprehensive web application that implements the Alignment Delegation Protocol (ADP), a system designed for intelligent routing and delegation of queries to specialized narrow models (NMs). The system functions as a demonstration platform for AI model coordination, featuring real-time monitoring, health tracking, and message routing capabilities.

The application serves as both a working implementation of ADP and a live demonstration environment, allowing users to submit queries that are intelligently routed to appropriate narrow models based on domain expertise, current load, and health status.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client is built as a modern React single-page application using TypeScript and Vite for development. The UI leverages shadcn/ui components built on Radix primitives for accessibility and consistency. The application uses TanStack Query for efficient server state management and Wouter for lightweight client-side routing.

The frontend follows a component-based architecture with specialized components for different aspects of the ADP system:
- Real-time dashboard with WebSocket connectivity for live updates
- Interactive query interface supporting multiple domains and priorities
- Visual routing diagrams showing delegation flow
- Health monitoring displays for narrow model status
- Message format viewers for ADP protocol compliance

### Backend Architecture
The server implements a REST API using Express.js with TypeScript, following a modular service-oriented design. The core routing logic is encapsulated in an ADPRouter service that handles intelligent delegation decisions based on narrow model availability, load balancing, and domain expertise.

The backend uses an in-memory storage implementation (with interfaces designed for easy database migration) and includes WebSocket support for real-time updates to connected clients. The routing system implements multiple delegation strategies including round-robin, weighted distribution, and health-aware routing.

### Data Storage Solutions
Currently implements an in-memory storage system using TypeScript Maps for development and demonstration purposes. The storage interface is designed with database migration in mind, supporting future PostgreSQL integration through Drizzle ORM.

The schema defines core entities including narrow models, query sessions, responses, coordination logs, and system statistics. All data models use Zod for runtime validation and type safety.

### Real-time Communication
WebSocket integration provides live updates for system monitoring, query processing status, and coordination agent logs. The WebSocket implementation includes automatic reconnection logic and message broadcasting to all connected clients.

### Authentication and Authorization
The current implementation focuses on the core ADP functionality without authentication. The message format specifications include OAuth2 token placeholders and user context fields for future security implementation.

### API Design
RESTful API endpoints handle:
- Narrow model management and health monitoring
- Query submission and session tracking
- System statistics and coordination logs
- Real-time routing decisions and delegation results

The API uses consistent error handling, request logging, and JSON response formatting throughout.

## External Dependencies

### Database Integration
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL dialect configuration
- **@neondatabase/serverless**: Serverless PostgreSQL driver for cloud deployment

### Frontend Framework
- **React 18**: Core frontend framework with modern hooks and concurrent features
- **Vite**: Fast development server and build tool with TypeScript support
- **TanStack Query**: Server state management with caching and synchronization

### UI Component System
- **shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Comprehensive set of accessible, unstyled UI components
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens

### Real-time Communication
- **WebSocket (ws)**: Native WebSocket implementation for real-time updates
- **Custom WebSocket client**: Browser-based WebSocket client with reconnection logic

### Development Tools
- **TypeScript**: Static type checking throughout the application
- **Zod**: Runtime schema validation and type inference
- **ESBuild**: Fast JavaScript bundler for production builds

### Styling and Design
- **Tailwind CSS**: Utility-first styling with custom color scheme and design tokens
- **Class Variance Authority**: Type-safe component variant management
- **Lucide React**: Consistent icon system throughout the interface

The system is designed to be self-contained for demonstration purposes while maintaining clear interfaces for production deployment with external databases, authentication systems, and AI model integrations.