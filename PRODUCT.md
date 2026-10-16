# ArchMap

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated implementation based on the accepted local web architecture: React, TypeScript, Vite, React Flow, and a local Node service. No paid infrastructure required for the first run.

## Users

Developers exploring unfamiliar code, onboarding, and reviewing dependencies before changing a feature.

## Product Purpose

Turn repositories into editable architecture maps with inspectable source evidence and guided explanations.

## Operating Context

Browser interface backed by a locally running repository reader. Self-hosting is a later milestone. Model inference is optional; using a hosted model sends selected code to that provider.

## Capabilities and Constraints

First increment: bounded JavaScript/TypeScript static dependency analysis, source inspection, editable graph, guided dependency walks, JSON import/export, local save, optional model explanations. Static dependencies must not be presented as runtime traces. Multi-language semantic analysis and automatic architecture refresh are open roadmap items.

## Brand Commitments

User retains the hacker/pixel layout and lettering inspired by cortad.com, but explicitly rejects green surfaces and accents. Use neutral graphite, warm white, restrained blue, and Anatomy-inspired mechanical explanatory figures. The user named the project ArchMap; its repository is https://github.com/ICEQ-JO/ArchMap. Open source with meaningful feature branches and commits; push and merge when the remote is provided.

## Evidence on Hand

Empty repository at start. An explicitly labeled example project will provide reproducible demonstration data. No customers, testimonials, usage statistics, or performance claims exist.

## Product Principles

- Every observed dependency links to the exact source that established it.
- Distinguish static facts, model explanations, and user-authored changes.
- Useful without model credentials.
- Preserve user ownership through readable portable project files.
- Keep analysis bounded and repository reads constrained.
