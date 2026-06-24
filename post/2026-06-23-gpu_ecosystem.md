+++
title = "State of Julia's GPU ecosystem in 2026"
author = "Guillaume Dalle"
abstract = """
  A summary of the various packages making up Julia's GPU abilities, and how they interact."""
+++

{{abstract}}

## Hardware-specific

### Vendor packages

- [CUDA.jl](https://github.com/JuliaGPU/CUDA.jl) (NVIDIA)
  - Sublibraries: cuBLAS, cuSPARSE, etc.
  - [cuTile.jl](https://github.com/JuliaGPU/cuTile.jl)
  - [CUDSS.jl](https://github.com/exanauts/CUDSS.jl)
  - [cuNumeric.jl](https://github.com/JuliaLegate/cuNumeric.jl)
- [AMDGPU.jl](https://github.com/JuliaGPU/AMDGPU.jl) (AMD)
- [oneAPI.jl](https://github.com/JuliaGPU/oneAPI.jl) (Intel)
- [Metal.jl](https://github.com/JuliaGPU/Metal.jl) (Apple)
- [OpenCL.jl](https://github.com/JuliaGPU/OpenCL.jl)
- [Vulkan.jl](https://github.com/JuliaGPU/Vulkan.jl) / [Lava.jl](https://github.com/SimonDanisch/Lava.jl)

### Vendor detection / translation

- [GPUSelect.jl](https://github.com/SimonDanisch/GPUSelect.jl)
- [GPUEnv.jl](https://github.com/hakkelt/GPUEnv.jl)
- [Juliana.jl](https://github.com/artecs-group/Juliana.jl)

## Hardware-agnostic

### Data types

- [GPUArrays.jl](https://github.com/JuliaGPU/GPUArrays.jl)
  - [GPUArraysCore.jl](https://github.com/JuliaGPU/GPUArrays.jl/tree/main/lib/GPUArraysCore)
  - [JLArrays.jl](https://github.com/JuliaGPU/GPUArrays.jl/tree/main/lib/JLArrays)
- [Adapt.jl](https://github.com/JuliaGPU/Adapt.jl)

### Low-level kernels

- [KernelAbstractions.jl](https://github.com/JuliaGPU/KernelAbstractions.jl)
- [KernelIntrinsics.jl](https://github.com/epilliat/KernelIntrinsics.jl)

### High-level kernels

- [AcceleratedKernels.jl](https://github.com/JuliaGPU/AcceleratedKernels.jl)
- [GemmKernels.jl](https://github.com/JuliaGPU/GemmKernels.jl)
- [KernelForge.jl](https://github.com/epilliat/KernelForge.jl)
- [JACC.jl](https://github.com/JuliaGPU/JACC.jl)
- Tensor operations:
  - [Tullio.jl](https://github.com/mcabbott/Tullio.jl)
  - [TensorCast.jl](https://github.com/mcabbott/TensorCast.jl)
  - [OMEinsum.jl](https://github.com/under-Peter/OMEinsum.jl)
  - [TensorOperations.jl](https://github.com/QuantumKitHub/TensorOperations.jl)

### Whole-program optimization

- [Reactant.jl](https://github.com/EnzymeAD/Reactant.jl)
  - [ReactantCore.jl](https://github.com/EnzymeAD/Reactant.jl/tree/main/lib/ReactantCore)
