+++
title = "State of Julia's GPU ecosystem in 2026"
author = "Guillaume Dalle"
abstract = """
  A summary of the various packages making up Julia's GPU abilities, and how they interact."""
+++

{{abstract}}

> The text of this post was written by Claude Sonnet 4.6, then reviewed and edited by Guillaume Dalle. The initial structure and list of packages had been manually curated beforehand.

Julia's GPU ecosystem has grown into a rich, layered stack that spans everything from vendor-specific low-level wrappers to hardware-agnostic high-level abstractions.
This post gives an overview of the major packages, organized by where they sit in that stack.
The distinction between hardware-specific and hardware-agnostic packages is the key design principle: vendor-specific backends provide raw access to each GPU platform, while a shared set of abstractions lets library authors and users write code that is portable across all of them.

## Hardware-specific

### CUDA ecosystem

The CUDA ecosystem is the most mature part of Julia's GPU stack, built around NVIDIA hardware.

[CUDA.jl](https://github.com/JuliaGPU/CUDA.jl) is the primary interface for programming NVIDIA GPUs in Julia.
As a meta-package, it bundles a user-friendly array abstraction (`CuArray`), a compiler for writing CUDA kernels directly in Julia, and wrappers for a broad set of CUDA libraries including cuBLAS, cuSPARSE, cuFFT, cuSolver, and cuDNN.
Most Julia users who target NVIDIA hardware start here and never need to go deeper.

[cuTile.jl](https://github.com/JuliaGPU/cuTile.jl) exposes NVIDIA's tile-based programming model, available on Ampere and newer GPUs, through a high-level Julia interface to the Tile IR architecture.
It shines at fusing complex operations into single kernels and supports specialized numeric types such as FP8 and mixed-precision formats that are central to modern machine learning workloads.
Whereas CUDA.jl covers the breadth of CUDA, cuTile.jl is the tool of choice when squeezing maximum throughput out of NVIDIA's latest tensor cores.

[CUDSS.jl](https://github.com/exanauts/CUDSS.jl) is a Julia wrapper for NVIDIA's cuDSS library, which provides GPU-accelerated sparse linear solvers.
It exposes three factorization methods (LDU, LDLᵀ, and LLᵀ) and fills a gap left by the main CUDA.jl bundle, since cuDSS remains in preview and is shipped separately.
The package is particularly relevant to scientific computing applications—optimization, finite elements, graph problems—where sparse system solves are a bottleneck.

[cuNumeric.jl](https://github.com/JuliaLegate/cuNumeric.jl) wraps NVIDIA's cuPyNumeric C++ API to bring distributed, multi-GPU array computing to Julia.
It provides an `NDArray` abstraction that supports standard array operations and can transparently dispatch work across both GPUs and CPUs.
The package is a bridge to the Legate runtime, enabling Julia programs to scale to clusters of GPUs with minimal code changes.

### Other vendors

Beyond NVIDIA, Julia has backends for every major GPU platform.

[AMDGPU.jl](https://github.com/JuliaGPU/AMDGPU.jl) brings AMD GPU computing to Julia through ROCm integration.
It mirrors the structure of CUDA.jl—providing an array type, a kernel compiler, and library wrappers—for AMD's graphics and compute hardware.
For users on AMD platforms or working with HPC systems where AMD GPUs are prevalent, AMDGPU.jl is the entry point.

[oneAPI.jl](https://github.com/JuliaGPU/oneAPI.jl) targets Intel GPUs and accelerators through Intel's oneAPI unified programming toolkit.
It provides low-level Level Zero API wrappers, a `oneArray` type that integrates with Julia's array ecosystem, and oneMKL bindings for optimized linear algebra and sparse matrix operations.
This makes Intel GPU hardware—including integrated graphics on many laptops—a first-class target for Julia GPU code.

[Metal.jl](https://github.com/JuliaGPU/Metal.jl) enables GPU programming on macOS using Apple's Metal framework, targeting M-series chips.
The package offers three levels of abstraction: high-level array operations via `MtlArray`, custom kernel programming, and direct Metal API access through ObjectiveC bindings.
While still under active development with some known limitations, it allows Mac users to run GPU-accelerated Julia code without any external hardware.

[OpenCL.jl](https://github.com/JuliaGPU/OpenCL.jl) provides a comprehensive Julia interface to the OpenCL standard, which targets GPUs, FPGAs, DSPs, and multicore CPUs from a single API.
The package supports both traditional OpenCL C kernels and native Julia functions compiled to SPIR-V, making it the most broadly portable of the hardware-specific backends.
It is a practical choice when targeting hardware not covered by the other backends, or when writing code that needs to run on a wide variety of devices.

[Vulkan.jl](https://github.com/JuliaGPU/Vulkan.jl) wraps the Vulkan graphics and compute API, generating bindings automatically from the official Vulkan specification with minimal overhead over the underlying C interface.
Where OpenCL.jl offers portability at the cost of abstraction, Vulkan provides explicit, low-overhead control over GPU resources.
The package is still pre-1.0 but is actively developed, and serves as the foundation for higher-level graphics and compute work in Julia.

[Lava.jl](https://github.com/SimonDanisch/Lava.jl) is a Julia GPU backend that compiles Julia code to SPIR-V for execution via Vulkan, functioning as a unified compute, graphics, and ray tracing platform.
It serves as a drop-in replacement for other GPU backends through the KernelAbstractions.jl and GPUArrays.jl interface, while additionally enabling graphics shaders and hardware-accelerated ray tracing written entirely in Julia rather than GLSL.
The package supports cross-platform execution on NVIDIA, AMD, Intel, Apple, and software renderers, and has demonstrated 1.4–2.5× speedups over AMDGPU on ray tracing workloads.

### Vendor detection and translation

As the number of backends grows, tooling for selecting and migrating between them becomes important.

[GPUSelect.jl](https://github.com/SimonDanisch/GPUSelect.jl) automates GPU backend selection for KernelAbstractions.jl by detecting available hardware at runtime through driver libraries.
It provides applications with a one-liner interface to load the appropriate backend—whether CUDA, AMDGPU, Metal, oneAPI, or Vulkan—without manual configuration.
The package is designed for end-user applications rather than libraries, handling both detection and, when needed, automatic installation of the relevant backend.

[GPUEnv.jl](https://github.com/hakkelt/GPUEnv.jl) simplifies multi-backend development by automatically detecting available GPU hardware and creating temporary overlay environments containing only the relevant backend packages.
Rather than permanently including all GPU dependencies in a project, it conditionally activates only the packages that match the host machine's hardware.
This keeps parent environments lean and fast to resolve, which matters especially in CI and shared HPC environments.

[Juliana.jl](https://github.com/artecs-group/Juliana.jl) is a translation tool that automatically converts Julia code written for CUDA.jl into portable multi-backend code compatible with KernelAbstractions.jl.
This allows GPU programs originally written for NVIDIA hardware to run on Intel, AMD, and Apple GPUs without manual rewriting.
It is most useful for porting existing CUDA.jl codebases toward hardware-agnostic designs without starting from scratch.

## Hardware-agnostic

### Data types

The hardware-agnostic layer starts with array types and the utilities to move data between them.

[GPUArrays.jl](https://github.com/JuliaGPU/GPUArrays.jl) is the foundational package that defines the shared interface all Julia GPU array types implement.
Rather than serving end users directly, it establishes the `AbstractGPUArray` contract—analogous to Julia's `AbstractArray`—that backend developers implement when building types like `CuArray`, `ROCArray`, or `MtlArray`.
The package also ships two companion sub-packages: GPUArraysCore.jl, which provides the minimal type hierarchy for packages that only need to check whether an array is on a GPU, and JLArrays.jl, a CPU-backed reference implementation used for testing.

[Adapt.jl](https://github.com/JuliaGPU/Adapt.jl) provides a mechanism for converting wrapper types to GPU-compatible formats while preserving their structure.
Unlike `convert()`, the `adapt(T, x)` function knows how to unwrap and re-wrap types like `Adjoint` or `NamedTuple` around GPU arrays rather than discarding them.
GPU libraries including CUDA.jl use Adapt.jl's extension hooks (`adapt_structure` and `adapt_storage`) to make data movement to the device transparent, which is why user-defined structs containing arrays typically only need a single `Adapt.@adapt_structure` annotation to become GPU-compatible.

### Low-level kernels

Two packages provide the primitives for writing custom GPU kernels in a portable way.

[KernelAbstractions.jl](https://github.com/JuliaGPU/KernelAbstractions.jl) is the central abstraction layer for writing GPU kernels that run across multiple hardware backends.
It provides a unified, minimal `@kernel` macro that compiles to NVIDIA CUDA, AMD ROCm, Intel oneAPI, and Apple Metal without any backend-specific rewrites.
Most hardware-agnostic libraries in Julia—including AcceleratedKernels.jl, Lava.jl, and JACC.jl—build on top of it, making it the glue that holds the portable GPU stack together.

[KernelIntrinsics.jl](https://github.com/epilliat/KernelIntrinsics.jl) provides low-level memory access primitives and warp-level operations for GPU kernel authors who need fine-grained control beyond what KernelAbstractions.jl exposes.
It covers memory fencing, warp shuffle and reduction operations, and vectorized memory access, and does so across CUDA, ROCm, and Metal backends.
The package is aimed at library developers rather than end users: it fills the gap between high-level kernel abstractions and the raw hardware intrinsics that performance-critical GPU code sometimes requires.

### High-level kernels

Several packages build on KernelAbstractions.jl to provide ready-made parallel algorithms.

[AcceleratedKernels.jl](https://github.com/JuliaGPU/AcceleratedKernels.jl) provides cross-architecture parallel algorithms—sorting, reduction, accumulation, and more—that compile from a single codebase to multithreaded CPUs, CUDA, ROCm, oneAPI, and Metal.
It leverages Julia's compilation model to generate efficient code for each target without maintaining separate hardware-specific implementations.
For workloads that consist primarily of these standard operations, it offers a "write once, run everywhere" experience with native performance.

[GemmKernels.jl](https://github.com/JuliaGPU/GemmKernels.jl) is a flexible framework for crafting optimized General Matrix Multiplication (GEMM) kernels on NVIDIA GPUs.
It decomposes GEMM into modular, customizable components—parameters, layouts, transforms, operators, and epilogues—that users can mix and match through Julia's multiple dispatch system.
The package delivers around 50–80% of the performance of cuBLAS and CUTLASS, and is the right tool when the standard BLAS interface is too inflexible for a particular memory layout or numeric type.

[KernelForge.jl](https://github.com/epilliat/KernelForge.jl) is a pure Julia library of high-performance, portable GPU primitives including map-reduce, prefix scans, matrix-vector products, and sorting.
It targets both NVIDIA and AMD hardware and aims for performance comparable to optimized C++ libraries, without requiring any non-Julia dependencies.
The package fills a practical gap for authors who need efficient low-level building blocks but want to stay within the Julia ecosystem.

[JACC.jl](https://github.com/JuliaGPU/JACC.jl) provides a vendor-neutral API for CPU and GPU computing inspired by C++ frameworks like Kokkos and RAJA.
Its `parallel_for` and `parallel_reduce` primitives deploy to CUDA, AMD, Metal, oneAPI, or CPU threads from a single codebase, with the backend selected at package load time.
The package is particularly well suited for HPC workloads: developers can write and test kernels on a laptop CPU and then deploy them to multi-GPU supercomputer nodes without changing any application code.

### Tensor operations

For operations on multi-dimensional arrays expressed through index notation, several packages provide GPU-aware implementations.

[Tullio.jl](https://github.com/mcabbott/Tullio.jl) provides a macro that translates index notation into optimized array operations, spanning multi-threading, SIMD vectorization, and GPU kernels through KernelAbstractions.jl.
It handles complex patterns including convolutions, reductions, and scatter/gather, and supports automatic differentiation for machine learning workflows.
Because the same `@tullio` expression dispatches to the appropriate backend based on the input array type, existing GPU arrays from CUDA.jl or AMDGPU.jl benefit automatically.

[TensorCast.jl](https://github.com/mcabbott/TensorCast.jl) enables reshaping, permuting, slicing, and reducing multi-dimensional arrays using an intuitive index notation that compiles down to Julia's native broadcasting and array operations.
When given GPU arrays from CUDA.jl or other backends, broadcasting operations execute directly on the device, so the package integrates naturally into GPU workflows without requiring any special GPU-specific code paths.
It is particularly useful for expressing data layout transformations that would otherwise require verbose combinations of `reshape`, `permutedims`, and `dropdims`.

[OMEinsum.jl](https://github.com/under-Peter/OMEinsum.jl) implements Einstein summation over arbitrary tensor networks with GPU acceleration via cuBLAS and cuTENSOR.
It uses Julia's multiple dispatch to select the most efficient backend for each contraction—standard matrix multiplication for simple cases, cuTENSOR for general tensor networks—without runtime overhead.
The package is especially valuable in quantum computing and machine learning research, where large tensor network contractions are a core computational primitive.

[TensorOperations.jl](https://github.com/QuantumKitHub/TensorOperations.jl) provides fast tensor contractions, permutations, and traces using Einstein index notation, with GPU acceleration through CUDA and integration with cuTENSOR v2.
The package supports automatic differentiation and offers flexible backend selection, allowing the same high-level expression to dispatch to optimized implementations on whichever hardware is available.
It is a go-to tool in quantum chemistry and condensed matter physics, where tensor operations on large arrays are ubiquitous.

### Whole-program optimization

[Reactant.jl](https://github.com/EnzymeAD/Reactant.jl) takes a different approach to GPU execution: rather than offering array types or kernel abstractions, it compiles entire Julia functions to MLIR and optimizes them for execution on CPUs, GPUs, and TPUs via XLA.
It works by tracing the program to remove control flow and type instabilities, then handing the resulting computation graph to XLA for whole-program optimization and device dispatch.
A companion sub-package, ReactantCore.jl, exposes the minimal type hierarchy needed by other packages to be Reactant-aware, allowing the broader Julia ecosystem to interoperate with Reactant's compilation pipeline.
