using Luxor, LuxorGraphPlot
using LaTeXStrings, MathTeXEngine, PGFPlotsX

# tensors

function tensors()
    width, height = 200, 400

    node_1 = Point(-90, 0)
    node_2 = Point(90, 0)

    r = 50

    @svg begin
        setline(2)
        sethue("black")
        circle(node_1, r, :stroke)
        circle(node_2, r, :stroke)
        line(node_1, node_2)
        sethue("black")
        setline(2)
        fontsize(30)
        text(L"A_{i}", node_1, halign=:center, valign=:center)
        text(L"B_{ij}", node_2, halign=:center, valign=:center)

        sethue("black")
        line(Point(-90, -50), Point(-90, -90), action = :stroke)
        line(Point(90, -50), Point(90, -90), action = :stroke)
        line(Point(140, 0), Point(180, 0), action = :stroke)

        text(L"i", Point(-80, -70), halign=:center, valign=:center)
        text(L"i", Point(80, -70), halign=:center, valign=:center)
        text(L"j", Point(180, - 20), halign=:center, valign=:center)

        text("Vector", Point(-80, 80), halign=:center, valign=:center)
        text("Matrix", Point(90, 80), halign=:center, valign=:center)

    end height width joinpath(@__DIR__, "../figs/tensors.svg")
end

tensors()

function tensor_network()
    width, height = 200, 400

    node_1 = Point(-120, 0)
    node_2 = Point(-30, 0)
    node_3 = Point(100, 0)

    r = 30

    @svg begin
        setline(2)
        sethue("black")
        circle(node_1, r, :stroke)
        circle(node_2, r, :stroke)
        circle(node_3, r, :stroke)
        line(node_1, node_2)
        sethue("black")
        setline(2)
        fontsize(30)
        text(L"A_{ik}", node_1, halign=:center, valign=:center)
        text(L"B_{kj}", node_2, halign=:center, valign=:center)
        text(L"C_{ij}", node_3, halign=:center, valign=:center)

        sethue("black")
        line(Point(-30, -30), Point(-30, -60), action = :stroke)

        line(Point(100, -30), Point(100, -60), action = :stroke)
        line(Point(130, 0), Point(160, 0), action = :stroke)

        line(Point(-120, -30), Point(-120, -60), action = :stroke)
        line(Point(-90, 0), Point(-60, 0), action = :stroke)

        text(L"i", Point(-130, -60), halign=:center, valign=:center)

        text(L"j", Point(-40, -60), halign=:center, valign=:center)

        text(L"k", Point(-80, 50), halign=:center, valign=:center)

        text(L"i", Point(80, -60), halign=:center, valign=:center)
        text(L"j", Point(180, - 20), halign=:center, valign=:center)

        text(L"=", Point(30, 5), halign=:center, valign=:center)

    end height width joinpath(@__DIR__, "../figs/tensor_network.svg")
end

tensor_network()

function mps()
    width, height = 500, 100
    n = 5
    unit = 80
    radius = 15
    offsetx, offsety = 50, 50
    x0 = -offsetx / 2
    y0 = height / 2 - offsety / 2
    @svg begin
        origin(0, 0)
        background("white")
        fontsize(16)
        node1s = []
        node2s = []
        for i=1:n
            node1 = circlenode(Point(x0 + i * unit, y0), radius)
            node2 = circlenode(Point(x0 + i * unit + offsetx, y0 + offsety), radius)
            push!(node1s, node1)
            push!(node2s, node2)
        end
        con1s, con2s = [], []
        for i=1:n-1
            push!(con1s, Connection(node1s[i], node1s[mod1(i+1, n)]))
            push!(con2s, Connection(node2s[i], node2s[mod1(i+1, n)]))
        end
        con3s = []
        for i=1:n
            push!(con3s, Connection(node1s[i], node2s[i]))
        end
        setcolor("black")
        LuxorGraphPlot.stroke.(node1s)
        LuxorGraphPlot.stroke.(con1s)
        # setcolor("gray")
        # LuxorGraphPlot.stroke.(node2s)
        # LuxorGraphPlot.stroke.(con2s)
        setcolor("red")
        LuxorGraphPlot.stroke.(con3s)

        setcolor("black")
        path = [offset(midpoint(node1s[1], node2s[1]), "bottomleft", radius)]
        for i=1:n-1
            push!(path, offset(midpoint(node1s[i], node1s[i+1]), "top", radius))
            push!(path, offset(midpoint(node2s[i], node2s[i+1]), "bottom", radius))
        end
        push!(path, offset(midpoint(node1s[n], node2s[n]), "topright", radius))
        setdash("dash")
        # LuxorGraphPlot.stroke(Connection(path[1], path[end];
        #     smoothprops=Dict(:radius=>5, :method=>"smooth"),
        #     control_points=path[2:end-1],
        #     ),
        # )
        text(L"\psi", offset(node1s[end], "right", 2radius))
        # text(L"\psi^*", offset(node2s[end], "right", 2radius))
    end width height joinpath(@__DIR__, "../figs/mps.svg")
end

mps()

function full_phi()
    width, height = 500, 150
    n = 5
    unit = 80
    radius = 15
    offsetx, offsety = 50, 50

    @svg begin
        setline(4)
        box(O, 450, 60, 10, action = :stroke)
        fontsize(20)
        text(L"\psi", Point(0, 0))
        line(Point(-200, -50), Point(-200, -30), action = :stroke)
        line(Point(-100, -50), Point(-100, -30), action = :stroke)
        line(Point(0, -50), Point(0, -30), action = :stroke)
        line(Point(100, -50), Point(100, -30), action = :stroke)
        line(Point(200, -50), Point(200, -30), action = :stroke)
    end width height joinpath(@__DIR__, "../figs/full_phi.svg")
end

full_phi()