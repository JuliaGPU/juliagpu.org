+++
title = "JuliaGPU"

[params]
lead = """
JuliaGPU is a GitHub organization that unifies the packages for programming GPUs
in Julia. With its high-level syntax and flexible compiler, Julia is well
positioned to productively program hardware accelerators without sacrificing
performance.
"""

[[params.examples]]
name = "CUDA.jl"
code = """
julia> using CUDA

julia> a = CUDA.rand(1024, 1024);

julia> sum(a .^ 2)   # runs on the GPU
349013.44f0

julia> function add_one!(a)
           i = threadIdx().x + (blockIdx().x - 1) * blockDim().x
           @inbounds a[i] += 1
           return
       end


julia> @cuda threads=256 blocks=4096 add_one!(a)
"""

[[params.examples]]
name = "AMDGPU.jl"
code = """
julia> using AMDGPU

julia> a = AMDGPU.rand(1024, 1024);

julia> sum(a .^ 2)   # runs on the GPU
349398.62f0

julia> function add_one!(a)
           i = workitemIdx().x +
               (workgroupIdx().x - 1) * workgroupDim().x
           @inbounds a[i] += 1
           return
       end

julia> @roc groupsize=256 gridsize=4096 add_one!(a)
"""

[[params.examples]]
name = "oneAPI.jl"
code = """
julia> using oneAPI

julia> a = oneAPI.rand(1024, 1024);

julia> sum(a .^ 2)   # runs on the GPU
349561.06f0

julia> function add_one!(a)
           i = get_global_id()
           @inbounds a[i] += 1
           return
       end


julia> @oneapi items=256 groups=4096 add_one!(a)
"""

[[params.examples]]
name = "Metal.jl"
code = """
julia> using Metal

julia> a = Metal.rand(1024, 1024);

julia> sum(a .^ 2)   # runs on the GPU
349217.3f0

julia> function add_one!(a)
           i = thread_position_in_grid().x
           @inbounds a[i] += 1
           return
       end


julia> @metal threads=256 groups=4096 add_one!(a)
"""

[[params.examples]]
name = "OpenCL.jl"
code = """
julia> using OpenCL, pocl_jll

julia> a = OpenCL.rand(1024, 1024);

julia> sum(a .^ 2)   # runs on PoCL
349702.84f0

julia> function add_one!(a)
           i = get_global_id()
           @inbounds a[i] += 1
           return
       end


julia> @opencl local_size=256 global_size=length(a) add_one!(a)
"""

[[params.examples]]
name = "KernelAbstractions.jl"
code = """
julia> using KernelAbstractions
julia> using CUDA # or AMDGPU, oneAPI, Metal, OpenCL

julia> @kernel function add_one!(a)
           i = @index(Global)
           @inbounds a[i] += 1
       end

julia> a = rand(Float32, 1024, 1024);   # on the CPU
julia> add_one!(get_backend(a))(a; ndrange=length(a))

julia> b = CUDA.rand(1024, 1024);       # on the GPU
julia> add_one!(get_backend(b))(b; ndrange=length(b))
"""
+++

## Publications

Much of Julia's GPU support was developed as part of academic research. If you would like
to help support it, please star the relevant repositories as such metrics may help us secure
funding in the future. If you use our software as part of your research, teaching, or other
activities, we would be grateful if you could cite our work:

- T. Besard, C. Foket, and B. De Sutter. "[Effective extensible programming:
  Unleashing Julia on
  GPUs.](https://ieeexplore.ieee.org/abstract/document/8471188)" *IEEE
  Transactions on Parallel and Distributed Systems* (2018).
- T. Besard, V. Churavy, Alan Edelman and B. De Sutter. "[Rapid software
  prototyping for heterogeneous and distributed
  platforms.](https://www.sciencedirect.com/science/article/pii/S0965997818310123)"
  *Advances in Engineering Software* (2019).
- T. Faingnaert, T. Besard, and B. De Sutter. "[Flexible Performant GEMM Kernels
  on GPUs.](https://ieeexplore.ieee.org/document/9655458)" *IEEE Transactions on
  Parallel and Distributed Systems* (2021).

## Community

If you need help, or have questions about GPU programming in Julia, you can find
members of the community at:

- Julia Discourse, with a dedicated [GPU
  section](https://discourse.julialang.org/c/domain/gpu/11)
- Julia Slack ([register here](https://julialang.org/slack/)), on the
  [#gpu channel](https://julialang.slack.com/messages/C689Y34LE/)
- [JuliaGPU office hours](https://meet.google.com/hmv-zqvp-tbf), every other
  week at 2PM CET \
  (check the [Julia community calendar](https://julialang.org/community/#events)
  for more details).
