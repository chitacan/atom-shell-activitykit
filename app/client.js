var d3          = require('./lib/d3/d3.js')
  , activitykit = require('activitykit');

var anchor   = document.querySelector('body')
  , parent   = anchor.parentElement || window
  , MARGIN   = {top: 5, right: 40, bottom: 5, left: 40}
  , width    = parent.clientWidth  || parent.innerWidth
  , height   = parent.clientHeight || parent.innerHeight
  , duration = 750
  , step     = 130
  , delay    = 1000
  , intervalId
  , prev;

var statusInfo = d3.select('#status');
var tree = d3.layout.tree()
.size([height, 1])
.separation(function() { return 1; });

var svg = d3.select(anchor).append("svg")
.attr("width", width - MARGIN.left - MARGIN.right)
.attr("height", height - MARGIN.top - MARGIN.bottom)

var g = svg
.append("g")
.attr("transform", function(d) { return "translate(-50," + MARGIN.top + ")"; });

g.append("g").attr("class", "link")
g.append("g").attr("class", "node")

function updateTree(root) {
  console.log('updated');
  statusInfo.style({
    'display': 'none'
  });

  var stack = root.stack;
  var focused = root.focused;

  var nodes = tree.nodes(stack);
  var links = tree.links(nodes);

  var link = g.select(".link")
    .selectAll("path")
    .data(links)

  link.enter().append("path").attr("class", linkType);
  link.exit().remove();

  var node = g.select(".node")
    .selectAll("g")
    .data(nodes)

  node.enter()
  .append("g")
  .attr("class", function(d) { return d.type; })
  .each(function(d) {
    d3.select(this).append('rect');
    d3.select(this).append("text")
    .attr("class", "name")
    .attr("dy", ".35em")
    .attr("x", function(d) { return 6; });
    d3.select(this)
    .append("text")
    .attr("class", "des")
    .attr("dy", ".35em")
  });
  node.select('text.name')
  .text(function(d) { return d.name; })
  .each(function(d) { d.width = Math.max(32, this.getComputedTextLength() + 12); })
  node.select('text.des')
  .text(function(d) {
    if (d.package) return d.package;
  })
  .attr("x", function(d) { return d.width + 10; });

  node.selectAll('rect')
  .classed({
    'focused': function(d) {
      return d.type === 'history' &&
        d.taskId === focused.taskId &&
        d.hash === focused.hash;
    }
  });

  node.exit().remove();

  node
  .filter(function(d) { return "join" in d; })
  .insert("path", "text").attr("class", "join");

  svg.call(layout);

  return svg;
}

function linkType(d) {
  return d.target.type.split(/\s+/).map(function(t) { return "to-" + t; })
  .concat(d.source.type.split(/\s+/).map(function(t) { return "from-" + t; }))
  .join(" ");
}

function layout(svg) {
  svg.selectAll("*")
  .style("stroke-opacity", null)
  .style("fill-opacity", null)
  .style("display", null);

  var node = svg.selectAll(".node g")
  .attr("class", function(d) { return d.type; })
  .attr("transform", function(d, i) { return "translate(" + d.depth * step + "," + d.x + ")"; });

  node.select("rect")
  .attr("ry", 6)
  .attr("rx", 6)
  .attr("y", -10)
  .attr("height", 20)
  .attr("width", function(d) { return d.width; });

  node.select('.join')
  .attr('d', function(d) {
    var sx = d.width
      , sy = 0
      , tx = d.width
      , ty = d.join * 24
    dx = tx - sx, dy = ty - sy,
    dr = 0.3 * Math.sqrt(dx * dx + dy * dy);
    return "M" + sx + "," + sy + "A" + dr + "," + dr + " 0 0,1 " + tx + "," + ty;
  });

  svg.selectAll(".link path")
  .attr("class", linkType)
  .attr("d", d3.svg.diagonal()
        .source(function(d) {
          return {y: d.source.depth * step + d.source.width, x: d.source.x};
        })
        .target(function(d) {
          return {y: d.target.depth * step, x: d.target.x};
        })
        .projection(function(d) {
          return [d.y, d.x];
        })
  );
}

// how to check diff??
//  - task count changed
//  - task's activity count changed
//  - activity hash changed
function isDiff(lhs, rhs) {

  if (!lhs || !rhs)
    return true;

  // focused activity changed
  if (lhs.focused.hash !== rhs.focused.hash)
    return true;

  // recent count changed
  if (lhs.recent.length !== rhs.recent.length)
    return true;

  var ltasks = lhs.stack.children
    , rtasks = rhs.stack.children;

  if (!ltasks || !rtasks)
    return true;

  var lnodes = ltasks[1].children
    , rnodes = rtasks[1].children;

  if (!lnodes || !rnodes)
    return true;

  if (lnodes.length != rnodes.length)
    return true;

  for (i = 0; i < lnodes.length; i++) {
    if (lnodes[i].children.length != rnodes[i].children.length)
      return true;
  }

  return false;
}

function update(stack) {
  var data = JSON.parse(stack.toString());

  if (isDiff(prev, data))
    updateTree(data);

  prev = data;
}

// fetch & update activity stack tree
function fetch() {
  activitykit.getActivityInfo()
  .then(function(stream) {
    stream.on('data', update);
  })
  .catch(function(e) {
    statusInfo
    .style({ 'display': 'block' })
    .text(e.message);
  });
}

function start(autoFetch) {
  fetch();
  if (autoFetch)
    intervalId = setInterval(fetch, delay);
}

function stop() {
  if (intervalId)
    clearInterval(intervalId);
}

start(true);

window.onresize = function() {
  var h = window.innerHeight - MARGIN.top - MARGIN.bottom;
  var w = window.innerWidth  - MARGIN.left - MARGIN.right;
  svg.attr("height", h)
  svg.attr("width",  w)

  tree.size([h, 1])

  svg.call(layout);
}
