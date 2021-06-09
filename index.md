+++
title = "JuliaGPU"
+++

~~~
<div id=home-jumbotron class="jumbotron text-center">
  <h1><img height=70 src="/assets/logo_crop.png">
      JuliaGPU</h1>
  <p class=font-125>
    High-performance GPU programming in a high-level language.
  </p>
</div>
~~~

JuliaGPU is a Github organization created to unify the many packages for programming GPUs in Julia. With its high-level syntax and flexible compiler, Julia is well positioned to productively program hardware accelerators like GPUs without
sacrificing performance.

Several GPU platforms are supported, but there are large differences in features and stability. On this website, you can find a brief introduction of the supported platforms and links to the respective home pages.

## Supported platforms

The best supported GPU platform in Julia is [**NVIDIA CUDA**](/cuda/), with mature and full-featured packages for both low-level kernel programming as well as working with high-level operations on arrays.
All versions of Julia are supported, and the functionality is actively used by a variety of applications and libraries.

Similar, but much newer capabilities exist for [**Intel GPUs with oneAPI**](/oneapi/). Currently, full-featured kernel programming capabilities are available, but there is no support for vendor libraries such as oneMKL or oneDNN yet.

Experimental support exists for [**AMD GPUs**](/rocm/) running on the ROCm stack. These GPUs can again be programmed in Julia at the kernel level or using array operations, but these capabilities are under heavy development and are not ready for general consumption yet.

## Applications

There are [many Julia applications and libraries](https://juliahub.com/ui/Packages/CUDAnative/4Zu2W/) that rely on the language's GPU
capabilities, such as:

- [Flux.jl](https://github.com/FluxML/Flux.jl) library for machine-learning
- [Yao.jl](https://github.com/QuantumBFS/Yao.jl) framework for quantum information research
- [DiffEqGPU.jl](https://github.com/JuliaDiffEq/DiffEqGPU.jl) as part of the DifferentialEquations.jl ecosystem, for using GPUs in differential equation solvers
- [Oceananigans.jl](https://github.com/climate-machine/Oceananigans.jl) to accelerate a non-hydrostatic ocean modeling application
- [GPUifyLoops.jl](https://github.com/vchuravy/GPUifyLoops.jl/) and [KernelAbstractions.jl](https://github.com/JuliaGPU/KernelAbstractions.jl) for working with CPUs and GPUs alike using vendor-neutral abstractions

Many other Julia applications and libraries can be used with GPUs, too: By means of GPU-specific array types like CuArray from CUDA.jl or ROCArray from AMDGPU.jl, existing software that uses the Julia array interfaces can often be executed as-is on a GPU.

## Publications

Much of Julia's GPU support was developed as part of academic research. If you would like
to help support it, please star the relevant repositories as such metrics may help us secure
funding in the future. If you use our software as part of your research, teaching, or other
activities, we would be grateful if you could cite our work:

[compiler-paper]: https://www.sciencedirect.com/science/article/pii/S0965997818310123

- Tim Besard, Christophe Foket, and Bjorn De Sutter. "[Effective extensible programming: Unleashing Julia on GPUs.](https://ieeexplore.ieee.org/abstract/document/8471188)" *IEEE Transactions on Parallel and Distributed Systems* (2018).
- Tim Besard, Valentin Churavy, Alan Edelman and Bjorn De Sutter. "[Rapid software prototyping for heterogeneous and distributed platforms.][compiler-paper]" *Advances in Engineering Software* (2019).

## Community

If you need help, or have questions about GPU programming in Julia, you can find members of
the community at:

- Julia Discourse, with a dedicated [GPU section](https://discourse.julialang.org/c/domain/gpu/11)
- Julia Slack ([register here](https://slackinvite.julialang.org/)), on the [#gpu channel](https://julialang.slack.com/messages/C689Y34LE/)
