+++
title = "JuliaGPU"

[params]
lead = """
JuliaGPU is a GitHub organization that unifies the packages for programming GPUs
in Julia. With its high-level syntax and flexible compiler, Julia is well
positioned to productively program hardware accelerators without sacrificing
performance.
"""
example = """
julia> using CUDA   # or AMDGPU, oneAPI, Metal

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
- Julia Slack ([register here](https://slackinvite.julialang.org/)), on the
  [#gpu channel](https://julialang.slack.com/messages/C689Y34LE/)
- [JuliaGPU office hours](https://meet.google.com/hmv-zqvp-tbf), every other
  week at 2PM CET \
  (check the [Julia community calendar](https://julialang.org/community/#events)
  for more details).
