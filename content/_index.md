---
title: JuliaGPU
---

JuliaGPU is a Github organization created to unify the many packages for
programming GPUs in Julia. With its high-level syntax and flexible compiler,
Julia is well positioned to productively program hardware accelerators like GPUs
without sacrificing performance.

Several GPU platforms are supported, but there are large differences in features
and stability. On this website, you can find a brief introduction of the
supported platforms and links to the respective home pages.


## Supported platforms

The best supported GPU platform in Julia is **[NVIDIA CUDA](cuda)**, with
mature and full-featured packages for both low-level kernel programming as well
as working with high-level operations on arrays. All versions of Julia are
supported, and the functionality is actively used by a variety of applications
and libraries.

Experimental support exists for **[AMD GPUs](rocm)** running on the ROCm stack.
These GPUs can similarly be programmed in Julia at the kernel level or using
array operations, but these capabilities are under heavy development and are not
ready for general consumption yet.

Lastly, there is limited support for programming GPUs with **[OpenCL](opencl)**.
It is possible to interface with such GPUs to execute kernels written in OpenCL
C, but the native programming capabilities are not supported on recent versions
of Julia anymore.


## Applications

There are [many Julia applications and libraries](https://juliahub.com/ui/Packages/CUDAnative/4Zu2W/) that rely on the language's GPU
capabilities, such as:

- [Flux.jl](https://github.com/FluxML/Flux.jl) library for machine-learning
- [Yao.jl](https://github.com/QuantumBFS/Yao.jl) framework for quantum information research
- [DiffEqGPU.jl](https://github.com/JuliaDiffEq/DiffEqGPU.jl) as part of the
  DifferentialEquations.jl ecosystem, for using GPUs in differential equation solvers
- [Oceananigans.jl](https://github.com/climate-machine/Oceananigans.jl) to accelerate a
  non-hydrostatic ocean modeling application
- [GPUifyLoops.jl](https://github.com/vchuravy/GPUifyLoops.jl/) and
  [KernelAbstractions.jl](https://github.com/JuliaGPU/KernelAbstractions.jl) for
  working with CPUs and GPUs alike using vendor-neutral abstractions

Many other Julia applications and libraries can be used with GPUs, too: By means of the
CuArrays.jl or ROCArrays.jl packages for respectively NVIDIA and AMD, existing software that
uses the Julia array interfaces can often be executed as-is on a GPU.


## Community

If you need help, or have questions about GPU programming in Julia, you can find members of
the community at:

- Julia Discourse, with a dedicated [GPU
  section](https://discourse.julialang.org/c/domain/gpu/11)
- Julia Slack ([register here](https://slackinvite.julialang.org/)), on the [#gpu
  channel](https://julialang.slack.com/messages/C689Y34LE/)
