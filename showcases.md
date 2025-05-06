+++
title = "Showcases"
+++

# Showcases

The Julia language, combined with its powerful GPU ecosystem, enables developers
and researchers to tackle demanding computational problems with unprecedented
productivity and performance. With **over [600
packages](https://juliahub.com/ui/Packages/General/GPUArrays#dependents)**
leveraging Julia's GPU capabilities, the ecosystem spans machine learning,
scientific simulation, quantum computing, and more.

Here are some highlights showcasing the versatility and power of Julia on GPUs.


## Flux.jl: Elegant Machine Learning

**[Flux.jl](https://github.com/FluxML/Flux.jl)** is Julia's premier machine
learning library, known for its flexibility and tight integration with the Julia
ecosystem. Moving computations from the CPU to the GPU is often trivial,
unlocking massive speedups for training deep learning models.

Here's an example of a simple multi-layer perceptron (MLP) model trained on a
synthetic dataset using Flux.jl. The network is defined and trained on the GPU
with minimal code changes, by simply applying the `device` function to the model
and data.

```julia
using Flux
using CUDA # Or AMDGPU, Metal

# Function to move data and model to the GPU
device = gpu_device()

# Define our model, and upload it to the GPU
model = Chain(
    # multi-layer perceptron with one hidden layer of size 3
    Dense(2 => 3, tanh),
    BatchNorm(3),
    Dense(3 => 2)) |> device

# Generate some data on the CPU
noisy = rand(Float32, 2, 1000)
truth = [xor(col[1]>0.5, col[2]>0.5) for col in eachcol(noisy)]

# Training loop (processing the data in batches)
target = Flux.onehotbatch(truth, [true, false])
loader = Flux.DataLoader((noisy, target), batchsize=64, shuffle=true)
for epoch in 1:1_000
    for xy_cpu in loader
        # Upload the batch to the GPU
        x, y = xy_cpu |> device
        loss, grads = Flux.withgradient(model) do m
            y_hat = m(x)
            Flux.logitcrossentropy(y_hat, y)
        end
        Flux.update!(opt_state, model, grads[1])
    end
end
```


## DiffEqGPU.jl: Accelerating Scientific Simulation

Part of the acclaimed
**[DifferentialEquations.jl](https://diffeq.sciml.ai/stable/)** (SciML)
ecosystem, **[DiffEqGPU.jl](https://github.com/JuliaDiffEq/DiffEqGPU.jl)**
provides highly optimized GPU kernels for solving large ensembles of
differential equations (ODEs, SDEs, etc.) in parallel. This enables massive
speedups for parameter sweeps, uncertainty quantification, and simulating
complex systems found in biology, physics, and engineering.

As an example, consider the Lorenz system, a classic chaotic system. The code
below demonstrates how to set up and solve a large ensemble of Lorenz equations.
Doing so in the GPU is as simple as changing the ensemble method to
`EnsembleGPUArray`:

```julia
using DiffEqGPU, OrdinaryDiffEq, CUDA
function lorenz(du, u, p, t)
    du[1] = p[1] * (u[2] - u[1])
    du[2] = u[1] * (p[2] - u[3]) - u[2]
    du[3] = u[1] * u[2] - p[3] * u[3]
end

u0 = Float32[1.0; 0.0; 0.0]
tspan = (0.0f0, 100.0f0)
p = [10.0f0, 28.0f0, 8 / 3.0f0]
prob = ODEProblem(lorenz, u0, tspan, p)
prob_func = function (prob, i, repeat)
    remake(prob, p = rand(Float32, 3) .* p)
end
monteprob = EnsembleProblem(prob, prob_func = prob_func, safetycopy = false)

# CPU-based
sol = solve(monteprob, Tsit5(), EnsembleThreads(),
            trajectories = 10_000, saveat = 1.0f0);

# GPU-based
sol = solve(monteprob, Tsit5(), EnsembleGPUArray(CUDA.CUDABackend()),
            trajectories = 10_000, saveat = 1.0f0);
```

The use of `EnsembleGPUArray` has a bit of overhead because it parallelizes at
the level of array operations. It is also possible to execute the entire solver
on the GPU by using `EnsembleGPUKernel`, which offers even better performance,
albeit at the the cost of some flexibility. For example, it requires using
special solvers and writing the the problem in out-of-place form:

```julia
using DiffEqGPU, OrdinaryDiffEq, StaticArrays, CUDA

function lorenz2(u, p, t)
    σ = p[1]
    ρ = p[2]
    β = p[3]
    du1 = σ * (u[2] - u[1])
    du2 = u[1] * (ρ - u[3]) - u[2]
    du3 = u[1] * u[2] - β * u[3]
    return SVector{3}(du1, du2, du3)
end

u0 = @SVector [1.0f0; 0.0f0; 0.0f0]
tspan = (0.0f0, 10.0f0)
p = @SVector [10.0f0, 28.0f0, 8 / 3.0f0]
prob = ODEProblem{false}(lorenz2, u0, tspan, p)
prob_func = function (prob, i, repeat)
    remake(prob, p = (@SVector rand(Float32, 3)) .* p)
end
monteprob = EnsembleProblem(prob, prob_func = prob_func, safetycopy = false)
sol = solve(monteprob, GPUTsit5(), EnsembleGPUKernel(CUDA.CUDABackend()),
            trajectories = 10_000, saveat = 1.0f0)
```


## Oceananigans.jl: Simulating Fluid Dynamics

**[Oceananigans.jl](https://github.com/CliMA/Oceananigans.jl)** is a fast,
friendly, and flexible software package for the numerical simulation of
incompressible, stratified flows in the ocean, atmosphere, and laboratory,
written in Julia.

GPU support in Oceananigans.jl is built on top of KernelAbstractions.jl, and
simply requires the user to specify the `GPU()` backend when creating the grid:

```julia
using Oceananigans

grid = RectilinearGrid(GPU(), size=(128, 128), x=(0, 2π), y=(0, 2π),
                       topology=(Periodic, Periodic, Flat))
model = NonhydrostaticModel(; grid, advection=WENO())
ϵ(x, y) = 2rand() - 1
set!(model, u=ϵ, v=ϵ)
simulation = Simulation(model; Δt=0.01, stop_time=4)
run!(simulation)
```
