var localAPI = false;
var loadDataInterval = 5*1000;
var apiUrl = "https://quotime.me/api/users";
if (localAPI) apiUrl = "http://localhost:8088/api/users"

var w = Math.max(window.innerWidth,300),
    h = Math.max(window.innerHeight-5,250),
    dragging = false,
    urlNodeRadius = 10,
    userNodeRadius = 20,
    userCount = 0,
    allNodes = [],
    allLinks = [];

var urlNodeDict = {};


var force = d3.layout.force()
    .size([w, h])
    .nodes([])
    .links([])
    .charge(-100)
    .gravity(0.07)
    .linkDistance(50);

var forceNodes = force.nodes(),
    forceLinks = force.links();

var svg = d3.select("#vis")
            .append("svg")
            .attr("width", w)
            .attr("height", h);
// make avatar round
svg.append('clipPath')
   .attr('id','clipObj')
        .append('circle')
        // .attr('cx',0)
        // .attr('cy',0)
        .attr('r', userNodeRadius);

function tryLoadingProfileImg (imgNode, userId) {
    var src = "https://s3.amazonaws.com/chat.anywhere.user.img/"+userId+'.jpg'

    $("<img/>").on('load', function() {
        var imgWidth = this.naturalWidth;
        var imgHeight = this.naturalHeight;
        var ratio = imgWidth/imgHeight;
        if (ratio < 1) ratio = 1/ratio;
        var radius = userNodeRadius*ratio;
        d3.select(imgNode)
            .attr("xlink:href", src)
            .attr("x", -radius)
            .attr("y", -radius)
            .attr("width", radius*2)
            .attr("height", radius*2);
     }).on('error', function() {
    }).attr("src", src);
    return 'images/profile-empty.png';
}
function getDomain(url) {
    var res = "";
    try {
        res = url.match(/:\/\/(.[^/]+)/)[1];
    }
    catch (err) {console.log(err);}
   return res;
}
function tryLoadingSiteFavicon (imgNode, url) {
    var src = 'https://favicon.yandex.net/favicon/'+getDomain(url);
    console.log(src);
    $("<img/>").on('load', function() {
        if (this.naturalWidth > 5)
            d3.select(imgNode).attr("xlink:href", src);
    }).attr("src", src);
    return 'images/dot.png';
}
function createUrlNode(url) {
    return {
        'url': url,
        'siteNode': true,
        'imgRadius': urlNodeRadius,
        'children': [],
        'users': {},
    }
}
function createUserNode(name, userId, url) {
    return {
        'name': name,
        'userId': userId,
        'url': url,
        'imgRadius': userNodeRadius,
        'link': null
    }
}
function loadData() {
    setTimeout(function(){loadData();}, loadDataInterval);

    // d3.json("online-users.json", function(data) {
    $.get(apiUrl, function(data) {
        var urlNodeDictNew = {};
        var shouldUpdate = false;
        var previousNodeCount = allNodes.length;
        allNodes = [];
        allLinks = [];
        userCount = 0;
        for (var url in data) {
            // only keep url node that contains users
            if (!data[url].length) continue;
            var urlNode = null;
            if (url in urlNodeDict) {
                urlNode = urlNodeDict[url];
            } else {
                urlNode = createUrlNode(url);
                shouldUpdate = true;
            }
            urlNode['children'] = [];
            allNodes.push(urlNode);
            urlNodeDictNew[url] = urlNode;
            // handle user nodes
            var userNodeDict = urlNode['users'];
            var userNodeDictNew = {};
            data[url].forEach(function(user) {
                userCount++;
                var userNode = null;
                if (user.userId in userNodeDict) {
                    userNode = userNodeDict[user.userId];
                } else {
                    userNode = createUserNode(user.username, user.userId, url);
                    shouldUpdate = true;
                }
                userNodeDictNew[user.userId] = userNode;
                urlNode['children'].push(userNode);
                allNodes.push(userNode);
            });
            urlNode['users'] = userNodeDictNew;
        }
        urlNodeDict = urlNodeDictNew;
        if (shouldUpdate || previousNodeCount != allNodes.length) update();
    });
}

function update() {
    $('.user-count').text(userCount);
    allLinks = d3.layout.tree().links(allNodes);
    forceNodes.length = 0;
    forceNodes.push.apply(forceNodes, allNodes);
    forceLinks.length = 0;
    forceLinks.push.apply(forceLinks, allLinks);

    // draw links as lines
    var link = svg.selectAll('.link').data(forceLinks, function(d) { return d.source.url+'-'+d.target.userId; });
    link.exit().remove();
    link.enter().append('line')
        .moveToBack()
        .attr('class', 'link')
        .style("opacity", 0)
        .transition().duration(3000).style("opacity", 1.0);

    var node = svg.selectAll('g.node').data(forceNodes, function(d) { return d.url+'-'+d.userId; });
    var removingNodes = node.exit();
    removingNodes.transition().duration(3000).style("opacity", 0);
    setTimeout(function(){removingNodes.remove();}, 3000);

    var nodeEnter = node.enter().append("svg:g").attr("class", function(d){d['node']=this;return "node"}).call(force.drag);
    var images = nodeEnter.append("svg:image");
        images.attr("xlink:href",  function(d) { 
            if (d.siteNode){
                return tryLoadingSiteFavicon(this, d.url);
            }
            return tryLoadingProfileImg(this, d.userId);
        })
        .attr("x", function(d) { return -d.imgRadius;})
        .attr("y", function(d) { return -d.imgRadius;})
        .attr("height", function(d) { return d.imgRadius*2;})
        .attr("width", function(d) { return d.imgRadius*2;})
        .style("opacity", 0)
        .transition().duration(3000).style("opacity", 1.0)
        .attr('clip-path','url(#clipObj)')
        ;

    nodeEnter.append("rect")
             .attr("class", "chat-message-background")
             .attr("rx", 5)
             .attr("ry", 5)
             .attr("x", 25)
             .attr("y", -15)
             .attr("width", function(d){d['msgBg']=this; return 0;})
             .attr("height", 30);

    nodeEnter.append("text").attr("class", "chat-message").attr("x", 35).attr("y", 3).text(function(d){d['msg']=this;}).style("opacity", 0)
        .transition().duration(3000).style("opacity", 1.0);
    images.on('click', function (d, wow) {
        d3.event.stopPropagation();
        if (dragging) return;
        $('header').show();
        $('header').css({top:d.y,left:d.x});
        d3.select("h2").html(d.name); 
        d3.select("h3").html ("<a target='_blank' title='"+d.url+"' href='" + d.url + "' >"  + d.url + "</a>" ); 
        $('header img').attr('src', this.href.baseVal);
        if (d.siteNode) {
            $('header img').css('height', '16px');
            $('header img').css('width', '16px');
            $('header img').css('border', 'none');
        } else {
            $('header img').css('border', '3px solid lightgray');
            $('header img').css('height', '108px');
            $('header img').css('width', '108px');
        }
    })
    .on("mousedown", function(){dragging = false;})
    .on("mousemove", function(){dragging = true;})

    force.on('tick', function() {
        node.attr("transform", function(d){
            return "translate(" + (d.x) + "," + (d.y) + ")";
        });
        link.attr('x1', function(d) { return d.source.x; })
            .attr('y1', function(d) { return d.source.y; })
            .attr('x2', function(d) { return d.target.x; })
            .attr('y2', function(d) { return d.target.y; });
    });
    force.start();

}
// https://github.com/wbkd/d3-extended
d3.selection.prototype.moveToFront = function() {  
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};
d3.selection.prototype.moveToBack = function() {  
    return this.each(function() { 
        var firstChild = this.parentNode.firstChild; 
        if (firstChild) { 
            this.parentNode.insertBefore(this, firstChild); 
        } 
    });
};
$(document).click(function(){
    $('header').hide();
})
loadData();
$('.url-input').val(location.href);
$('.url-btn').click(function(){
        window.chatboxLocation = $('.url-input').val();
        checkLocationChange();
});


var socket = io("https://quotime.me", {path:'/socket.io'});
socket.on('login', function(data){
    socket.emit('login', {
        username: 'watchman',
        userId: 'watchman-id',
        roomId: 'watchman',
        shareLocation: false,
        version: 'watchman'
    });
});
socket.on('new message', function(data){

    var userNode = urlNodeDict[data.url]["users"][data.sender]
    d3.select(userNode.node).moveToFront();
    d3.select(userNode.msg)
                .text(data.message)
                .transition()
                .style('opacity', 1)
                .transition().duration(5000)
                .style('opacity', 0);
    var textWidth = d3.select(userNode.msg)[0][0].getBBox().width;
    d3.select(userNode.msgBg)
      .attr('width', textWidth+20).transition()
      .style('opacity', 1)
      .transition().duration(5000)
      .style('opacity', 0);;
});

