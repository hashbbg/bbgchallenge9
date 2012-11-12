var settings = {
	tileSize: 32,
	gridSize: 20,
	entry: {X: 0, Y: 10},
	exit: {X: 19, Y: 10}
};

var util = {
	each: function(set, action) {
		for(var i = set.length - 1; i >= 0; --i) {
			if(action(set[i])) {
				set.splice(i, 1);
			}
		}
	}
};
function PathFinder(grid) {
	function equal(v, o) {
		return v.X === o.X && v.Y === o.Y
	}

	function distance(v, o) {
		return Math.sqrt(Math.pow(Math.abs(v.X - o.X), 2) + Math.pow(Math.abs(v.Y - o.Y), 2));
	}

	function isInList(item, list){
		for(var i = 0; i < list.length; i++){
			if(equal(item.P, list[i].P)) {
				return i;
			}
		}
		return -1;
	}
	this.find = function(start, end) {
		var openList = [],
			closedList = [],
			currentNode = start,
			parent = { G: 0, H: distance(start, end), F: distance(start, end), P: start },
	    	n, node, path, i, lowest;
		openList.push(parent);
		while(openList.length > 0){
			currentNode = parent.P;
			var neighbors = [ { G: parent.G + 1, H: 0, F: 0, P: {X: currentNode.X, Y: currentNode.Y - 1 } },
							  { G: parent.G + 1, H: 0, F: 0, P: {X: currentNode.X - 1, Y: currentNode.Y } },
							  { G: parent.G + 1, H: 0, F: 0, P: {X: currentNode.X, Y: currentNode.Y + 1 } },
							  { G: parent.G + 1, H: 0, F: 0, P: {X: currentNode.X + 1, Y: currentNode.Y } },
							];

			closedList.push(parent);
			openList.splice(isInList(parent, openList), 1);
			for(n = 0; n < neighbors.length; n++){
				if(	neighbors[n].P.X >= 0 &&
					neighbors[n].P.Y >= 0 &&
					neighbors[n].P.X < grid.map.length &&
					neighbors[n].P.Y < grid.map[0].length) {
					node = neighbors[n];
					if(equal(node.P, end)){

						path = [];
						node.parent = parent;
						path.unshift({X: node.P.X, Y: node.P.Y});
						while(!equal(node.P, start)){
							node = node.parent;
							path.unshift({X: node.P.X, Y: node.P.Y});
						}
						return path;
					}
					if(isInList(node, closedList) === -1 && (grid.map[node.P.X][node.P.Y])){
						node.H = distance(node.P, end);
						node.F = node.G + node.H;
						var listNode = openList[isInList(node, openList)];
						if(listNode && listNode.F > node.F){
							listNode.parent = parent;
							listNode.F = node.F;
							listNode.G = node.G;
						}
						else if(!listNode){
							node.parent = parent;
							openList.push(node);
						}
					}
				}
			}
	        lowest = 0;
			for(i = 0; i < openList.length; i++){
				if(openList[i].F < openList[lowest].F){
					lowest = i;
				}
			}
			parent = openList[lowest];
		}
		//No path found
		return [];
	}
}

function Projectile(canvas, grid, from, to) {
	var self = this,
		fireTime = (new Date()).getTime(),
		speed = 10 * Math.sqrt(Math.pow(Math.abs(from.X - to.X), 2) + Math.pow(Math.abs(from.Y - to.Y), 2));

	
	this.position = { X: from.X, Y: from.Y };

	this.damage = 5;

	this.range = 32;

	this.dead = false;

	this.update = function() {
		var	time = (new Date()).getTime() - fireTime,
			xD = to.X - from.X,
			yD = to.Y - from.Y;
			current = {X: from.X + (time/speed) * xD | 0, Y: from.Y + (time/speed) * yD | 0};
			
			if(time > speed) {
				self.dead = true;
			}
			self.position = current;
			//console.log(current);
	};

	this.draw = function() {
		canvas.context.save();
		canvas.context.translate(self.position.X + settings.tileSize / 2, self.position.Y + settings.tileSize /2);
		canvas.context.fillStyle = "red";
		canvas.context.fillRect(-2, -2, 4, 4);
		canvas.context.restore();
	};
}

function Creeper(canvas, grid, hp) {

	var self = this,
		lastUpdate = (new Date()).getTime(),
		pathFinder = new PathFinder(grid),
		path = pathFinder.find(settings.entry, settings.exit);

	this.position = grid.position(settings.entry);

	this.tilePosition = settings.entry;

	this.survivor = false;
	this.dead = false;

	this.hp = hp || 50;

	this.update = function() {
		var now = (new Date()).getTime(),
			diff = now - lastUpdate;
		/* move creeper along path */
		if(diff > 500 && path.length > 0) {
			this.tilePosition = path.shift();
			this.position = grid.position(this.tilePosition);
			lastUpdate = now;
			if(path.length > 0 && !grid.map[path[0].X][path[0].Y]) {
				path = pathFinder.find(this.tilePosition, settings.exit);	
			}
		} else {
			if(path.length > 0) {
				var from = grid.position(this.tilePosition),
					to = grid.position(path[0]);
				var xD = to.X - from.X,
					yD = to.Y - from.Y;
				from.X += (diff/500.0) * xD;
				from.Y += (diff/500.0) * yD;
				this.position = from;				
			}
		}
		if(this.tilePosition.X === settings.exit.X && this.tilePosition.Y === settings.exit.Y) {
			this.survivor = true;
		}
		if(this.hp <= 0) {
			this.dead = true;
		}
	}

	this.draw = function() {
		canvas.context.save();
		canvas.context.translate(self.position.X + settings.tileSize / 2, self.position.Y + settings.tileSize /2);
		canvas.context.fillStyle = "red";
		canvas.context.fillRect(-8, -8, 16, 16);
		canvas.context.restore();		
	}
}

function Tower(canvas, grid, position, creepers) {

	var self = this,
		lastShot = 0,
		loadTime = 500,
		projectiles = [],
		angle = 0;

	this.cost = 25;
	this.range = 4;
	
	this.position = grid.position(position) || {X: 0, Y: 0};

	this.tilePosition = position;

	grid.map[this.tilePosition.X][this.tilePosition.Y] = false;

	this.draw = function() {
		canvas.context.save();
		canvas.context.translate(self.position.X + settings.tileSize / 2, self.position.Y + settings.tileSize /2);
		canvas.context.rotate(angle);
		canvas.context.fillStyle = "green";
		canvas.context.fillRect(-8, -8, 16, 16);
		canvas.context.restore();
		util.each(projectiles, function(projectile) {
			projectile.draw();
		});
	};

	this.update = function() {
		var now = (new Date()).getTime();
		if(now - lastShot > loadTime) {
			for(var i = 0; i < creepers.length; i++) {
				if(Math.abs(creepers[i].tilePosition.X - self.tilePosition.X) < self.range &&
				   Math.abs(creepers[i].tilePosition.Y - self.tilePosition.Y) < self.range ) {
					//creepers[i].hp -= 10;
					projectiles.push(new Projectile(canvas, grid, this.position, creepers[i].position));
					lastShot = now;

					angle = Math.atan2((creepers[i].position.X - self.position.X), (self.position.Y - creepers[i].position.Y) );					
					break;
				}
			}			
		}
		util.each(projectiles, function(projectile) {
			projectile.update();
			if(projectile.dead) {
				for(var i = 0; i < creepers.length; i++) {
					if(Math.abs(creepers[i].position.X - projectile.position.X) < projectile.range &&
					   Math.abs(creepers[i].position.Y - projectile.position.Y) < projectile.range ) {
						creepers[i].hp -= projectile.damage;
					}
				}
				return true;
			}
		});		
	};

	this.destroy = function() {
		grid.map[this.tilePosition.X][this.tilePosition.Y] = true;
	};
}

function Canvas() {
	var self = this,
		canvas = document.getElementsByTagName("canvas")[0];
	this.screen = canvas.getContext("2d"),
	this.canvas = document.createElement("canvas"),
	this.context = this.canvas.getContext("2d"),
	this.width = 640,
	this.height = 640;

	this.canvas.width = this.width;
	this.canvas.height = this.height;
	
	this.position = (function() {
		var el = canvas,
			x = 0,
			y = 0;
		while(el) {
			x += el.offsetLeft;
			y += el.offsetTop;
			el = el.offsetParent;
		}
		console.log(x);
		console.log(y);
		return {X: x, Y: y};
	}());

	this.addEventListener = function(event, callback) {
		canvas.addEventListener(event, callback);
	}	
}

function Grid(canvas) {
	this.draw = function() {
		canvas.context.strokeStyle = "rgba(0, 0, 0, 0.4)";
		canvas.context.lineWidth = 2;
		canvas.context.beginPath();
		for(x = 0; x < canvas.width + 1; x += settings.tileSize) {
			canvas.context.moveTo(x, 0);
			canvas.context.lineTo(x, canvas.height);
		}
		for(y = 0; y < canvas.height + 1; y += settings.tileSize) {
			canvas.context.moveTo(0, y);
			canvas.context.lineTo(canvas.width, y);
		}
		canvas.context.stroke();
	};

	this.tile = function(pos) {
		return ({X: pos.X / settings.tileSize | 0, Y: pos.Y / settings.tileSize | 0});
	};

	this.position = function(tile) {
		return {X: tile.X * settings.tileSize, Y: tile.Y * settings.tileSize};
	};

	this.map = [];
	for(y = 0; y < settings.gridSize; y ++) {
		this.map[y] = [];
		for(x = 0; x < settings.gridSize; x++) {
			this.map[y][x] = true; //default - passable.
		}
	}
}

function Faucet() {
	var events = {},
		wave = 0.
		lastWave = 0,
		waveTime = 10000,
		creepTime = 1000,
		lastCreep = 0,
		creepCount = 0,
		fire = function(evt, data) {
			if(events[evt]) {
				for(var i = 0; i < events[evt].length; i++) {
					events[evt][i](data);
				}
			}
		};

	this.on = function(evt, cb) {
		if(!events[evt]) {
			events[evt] = [];
		}
		events[evt].push(cb);
	};
	this.update = function() {
		var now = (new Date()).getTime();
		if(now - lastCreep > waveTime) {
			wave++;
			fire("wave", wave);
			lastWave = now;
			creepCount = 0;
		}
		if( now - lastCreep > creepTime &&
			creepCount < wave * 10 | 0) {
			fire("creeper", wave * 50);
			lastCreep = now;
			creepCount++;
		}
	};
}
function Game(canvas, grid) {
	var self = this,
		pathFinder = new PathFinder(grid),
		lives = 20,
		towers = [],
		creepers = [],
		faucet = new Faucet(),
		credits = 200;

	faucet.on("wave", function(wave) {
		console.log("wave: " + wave);
	});
	faucet.on("creeper", function(hp) {
		creepers.push(new Creeper(canvas, grid, hp));
	});

	this.each = function(set, action) {
		for(var i = set.length - 1; i >= 0; --i) {
			if(action(set[i])) {
				set.splice(i, 1);
			}
		}
	};

	this.run = function() {
		canvas.context.fillStyle = "white";
		canvas.context.fillRect(0, 0, canvas.width, canvas.height);
		grid.draw();
		if(self.activeTile) {
			self.highlight(self.activeTile);	
		}	
		self.each(towers, function(tower) {
			tower.update();
			tower.draw();
		});
		self.each(creepers, function(creeper){
			creeper.update();
			creeper.draw();
			if(creeper.survivor) {
				lives--;
				return true;
			}
			if(creeper.dead) {
				credits+=5;
				return true;
			}
		});
		faucet.update();
		canvas.context.strokeStyle = "rgba(0,0,0,0.8)";
		canvas.context.fillStyle = "red";
		canvas.context.font = "22px arial";
		canvas.context.lineWidth = 4;
		canvas.context.strokeText("❤ " + lives, 10, 30);
		canvas.context.fillText("❤ " + lives, 10, 30);
		canvas.context.strokeText(" $ " + credits, 10, 60);
		canvas.context.fillText(" $ " + credits, 10, 60);		
		canvas.screen.drawImage(canvas.canvas, 0, 0);
	};

	this.mouseMove = function(pos) {
		var tile = grid.tile(pos);
		self.activeTile = tile;
	};

	this.mouseClick = function(pos) {
		var tile = grid.tile(pos);
		if(grid.map[tile.X][tile.Y]) {
			var tower = new Tower(canvas, grid, tile, creepers);
			if(pathFinder.find(settings.entry, settings.exit).length !== 0) {
				if(tower.cost <= credits) {
					credits -= tower.cost;
					towers.push(tower);
					console.log("$" + credits);
				} else {
					tower.destroy();
					console.log("You can't afford that.");
				}							
			} else {
				tower.destroy();
				console.log("You can't build that there.");				
			}
		} else {
			console.log("You can't build that there.");
		}	
	};

	this.highlight = function(tile) {
		if(grid.map[tile.X][tile.Y]) {
			canvas.context.fillStyle = "rgba(0, 0, 0, 0.4)";	
		} else {
			canvas.context.fillStyle = "rgba(255, 0, 0, 0.4)";
		}		
		canvas.context.fillRect(tile.X * settings.tileSize, tile.Y * settings.tileSize, settings.tileSize, settings.tileSize);
	};
} 

window.addEventListener("load", function(){
	var canvas = new Canvas();

	var grid = new Grid(canvas);

	var game = new Game(canvas, grid);

	setInterval(game.run, 17);

	canvas.addEventListener("mousemove", function(ev) {
		var mousePosition = {X: ev.clientX - canvas.position.X, Y: ev.clientY - canvas.position.Y};
		game.mouseMove(mousePosition);		
	});
	canvas.addEventListener("click", function(ev) {
		var mousePosition = {X: ev.clientX - canvas.position.X, Y: ev.clientY - canvas.position.Y};
		game.mouseClick(mousePosition);
	});
});