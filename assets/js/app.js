/*! App v1.0.0 | Klochko Oleksandr / @utoyvo | MIT License | (c) 2020 */
var app = (function() {

	window.requestAnimationFrame = window.requestAnimationFrame
	|| window.mozRequestAnimationFrame
	|| window.webkitRequestAnimationFrame
	|| window.msRequestAnimationFrame;

	var canvas      = document.getElementById("zoom-canvas"),
		zoom_canvas = $("#zoom-canvas"),
		context;

	var window_w,
		window_h;

	var center_x,
		center_y;

	var element_w,
		element_h;

	var start_position = 0,
		z_position     = 0,
		last_frame     = null,
		steps;

	var playback = false;

	var hue = 0,
		fx  = "sw"; // none | hueani | sw

	var slow_speed = 4,
		fast_speed = 5,
		portrait   = false;

	var speed         = fast_speed,
		visible_steps = 8,
		visit_start   = Date.now();

	var loaded         = false,
		load_percent   = 0,
		load_completed = false;

	var tile_width  = 1280,
		tile_height = 800;

	var z_opac        = 0,
		z_opac_target = 0;

	var color1 = "#222",
		color2 = "#444";

	var filter_elements = $(".filtered");

	var img_array     = [],
		img_path      = "assets/img/canvas/",
		img_extension = "jpg";

	for (var i = 1; i <= 32; i++) {
		img_array.push(img_path + i + "." + img_extension);
	}

	var length = img_array.length;

	/**
	 * Setup
	 */
	function setup() {
		context = canvas.getContext("2d");
		playlist();
		resize();
		setupSteps();
		waitForLoaded();
		window.requestAnimationFrame(loop);
	}

	if (canvas.getContext) {
		setup();
	}

	/**
	 * Resize
	 */
	function resize(scale) {
		if (window.devicePixelRatio !== undefined) {
			dpr = window.devicePixelRatio;
		} else {
			dpr = 1;
		}

		var w = $(window).width(),
			h = $(window).height();

		window_w = w * dpr;
		window_h = h * dpr;

		center_x = window_w / 2;
		center_y = window_h / 2;

		if (window_w > window_h * (tile_width / tile_height)) {
			element_w = window_w;
			element_h = window_w * (tile_height / tile_width);
		} else {
			element_w = window_h * (tile_width / tile_height);
			element_h = window_h;
		}

		portrait = (window_h > window_w);

		zoom_canvas.attr("width", window_w);
		zoom_canvas.attr("height", window_h);
	}

	$(window).resize(function() {
		resize();
	});

	/**
	 * Populate step objects array
	 */
	function setupSteps() {
		steps = [];
		for (var i = 0; i < img_array.length; i++) {
			steps.push(new zoomImg(img_array[i]));
		}
	}

	/**
	 * Wait For Loaded
	 */
	function waitForLoaded() {
		if (loaded) {
			$("#preloader").animate({"opacity": 0}, 1000);
		} else {
			setTimeout(function() {
				waitForLoaded();
			}, 10);
		}
	}

	/**
	 * Load Status
	 */
	function loadStatus() {
		if (!loaded) {
			load_percent = 0;

			var isready = steps.every(function(element) {
				if (element.ready) {
					load_percent += 100 / steps.length;
				}

				return element.ready;
			});

			if (isready) {
				zoom_canvas.animate({"opacity": 1}, (100 - z_opac) * 5);
				load_completed = true;
				wrapperFade();
			}

			return isready;
		} else {
			return true;
		}
	}

	/**
	 * Zoom Img
	 */
	function zoomImg(src) {
		var that   = this;
		this.ready = false;
		this.img   = new Image();
		this.img.onload = function() {
			that.ready = true;
			if (loadStatus()) {
				loaded = true;
				var load_time = (Date.now() - visit_start) / 1000;
			}
		};
		this.img.src = src;
	}

	/**
	 * Loop
	 */
	function loop(timestamp) {
		var elapsed = 0;

		if (!last_frame) {
			last_frame = timestamp;
		} else {
			elapsed    = timestamp - last_frame;
			last_frame = timestamp;
		}

		// CONTROL
		if (loaded) {
			var zoom_speed = 0.0003 * elapsed

			if (playback) {
				z_position += (zoom_speed / 8 * ((portrait) ? speed * 1.3 : speed));
			}

			if (z_position < 0) {
				z_position += steps.length;
			}

			if (z_position > steps.length) {
				z_position -= steps.length;
			}
		}

		// Display
		context.clearRect(0, 0, canvas.width, canvas.height);
		var step_array = [],
			scale      = Math.pow(2, (z_position % 1));

		for (var i = 0; i < visible_steps; i++) {
			step_array.push(steps[(Math.floor(z_position) + i) % steps.length]);
		}

		for (var i = 0; i < step_array.length; i++) {
			var x = center_x - element_w / 2 * scale,
				y = center_y - element_h / 2 * scale,
				w = element_w * scale,
				h = element_h * scale;

			if (step_array[i].ready) {
				context.drawImage(step_array[i].img, x, y, w, h);
			} else {
				context.fillStyle = ((Math.floor(z_position) + i) % 2 === 0) ? color1 : color2;
				context.fillRect(x, y, w, h);
			}

			scale *= 0.5;
		}

		if (!load_completed) {
			if ( step_array.every(function(e) {return e.ready})) {
				z_opac_target = load_percent;
			}

			if (z_opac < z_opac_target) {
				z_opac += 0.5;
			}

			zoom_canvas.css("opacity", (z_opac / 100));

			z_position = start_position;
		}

		if (fx === "none") {
			filterNone();
		} else if (fx === "hueani") {
			hue += elapsed / 50;

			if (hue >= 360) {
				hue -= 360;
			}

			filterHueani(hue);
		} else if (fx === "sw") {
			filterSw();
		}

		window.requestAnimationFrame(loop);
	}

	/**
	 * Filters
	 */
	function filterNone() {
		fx = "none";

		filter_elements.css("-webkit-filter", "none");
		filter_elements.css("-moz-filter",    "none");
		filter_elements.css("-ms-filter",     "none");
		filter_elements.css("-o-filter",      "none");
		filter_elements.css("filter",         "none");
	}

	function filterHueani(hue) {
		fx = "hueani";

		filter_elements.css("-webkit-filter", "hue-rotate(" + hue + "deg)");
		filter_elements.css("-moz-filter",    "hue-rotate(" + hue + "deg)");
		filter_elements.css("-ms-filter",     "hue-rotate(" + hue + "deg)");
		filter_elements.css("-o-filter",      "hue-rotate(" + hue + "deg)");
		filter_elements.css("filter",         "hue-rotate(" + hue + "deg)");
	}

	function filterSw() {
		fx  = "sw";

		filter_elements.css("-webkit-filter", "grayscale(100%)");
		filter_elements.css("-moz-filter",    "grayscale(100%)");
		filter_elements.css("-ms-filter",     "grayscale(100%)");
		filter_elements.css("-o-filter",      "grayscale(100%)");
		filter_elements.css("filter",         "grayscale(100%)");
	}

	/**
	 * Wrapper
	 */
	var wrapper    = document.getElementById("page"),
		idle_time  = Date.now(),
		wrapperO   = 0,
		fade_after = 3000;

	wrapper.addEventListener("mousemove", function(e) {
		idle_time = Date.now();
	});

	function wrapperFade() {
		if (Date.now() - idle_time > fade_after) {
			if (wrapperO > 0) {
				wrapperO -= 0.05;
			}

			wrapper.style.opacity = wrapperO;
			wrapper.style.cursor  = "none";

			setTimeout(wrapperFade, 40);
		} else if (wrapperO < 1) {
			wrapperO += 0.05;
			wrapper.style.opacity = wrapperO;
			wrapper.style.cursor  = "default";

			setTimeout(wrapperFade, 40);
		} else {
			setTimeout(wrapperFade, 100)
		}
	}

	/**
	 * FullScreen
	 */
	var is_fullscreen     = false,
		button_fullscreen = $("#fullscreen");

	button_fullscreen.mousedown(function(e) {
		toggleFullScreen();
	});

	document.addEventListener("fullscreenchange", function () {
		is_fullscreen = !!document.fullscreen;
		changeFullScreen();
	}, false);

	document.addEventListener("mozfullscreenchange", function () {
		is_fullscreen = !!document.mozFullScreen;
		changeFullScreen();
	}, false);

	document.addEventListener("webkitfullscreenchange", function () {
		is_fullscreen = !!document.webkitIsFullScreen;
		changeFullScreen();
	}, false);

	function changeFullScreen() {
		if (is_fullscreen) {
			button_fullscreen.addClass("icon-unfullscreen active").removeClass("icon-fullscreen").attr('title', 'Unfullscreen');
			$("body").addClass("fullscreen").removeClass("unfullscreen");
		} else {
			button_fullscreen.addClass("icon-fullscreen").removeClass("icon-unfullscreen active").attr('title', 'Fullscreen');
			$("body").addClass("unfullscreen").removeClass("fullscreen");
		}
	}

	function toggleFullScreen() {
		if (!document.fullScreenElement
			&& !document.mozFullScreenElement
			&& !document.webkitFullScreenElement
			&& !document.msFullScreenElement) {
			if (document.documentElement.requestFullScreen) {
				document.documentElement.requestFullScreen();
			} else if (document.documentElement.msRequestFullScreen) {
				document.documentElement.msRequestFullScreen();
			} else if (document.documentElement.mozRequestFullScreen) {
				document.documentElement.mozRequestFullScreen();
			} else if (document.documentElement.webkitRequestFullScreen) {
				document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
			}
		} else {
			if (document.exitFullScreen) {
				document.exitFullScreen();
			} else if (document.msExitFullScreen) {
				document.msExitFullScreen();
			} else if (document.mozCancelFullScreen) {
				document.mozCancelFullScreen();
			} else if (document.webkitExitFullScreen) {
				document.webkitExitFullScreen();
			}
		}
	}

	/**
	 * Player
	 */
	var audio       = $("#audio"),
		button_play = $("#play"),
		button_mute = $("#mute"),
		audio_volume;

	// Play
	button_play.mousedown(function(e) {
		audioPlay();
	});

	// Mute
	button_mute.mousedown(function(e) {
		audioMute();
	});

	// Keyboard
	$(document).keydown(function(event) {
		if (event.which === 32) {
			audioPlay();
		}

		if (event.which === 77) {
			audioMute();
		}

		if (event.which === 61) {
			audioVolumePlus();
		}

		if (event.which === 173) {
			audioVolumeMinus();
		}

		if (event.which === 122) {
			// FullScreen
		}
	});

	function audioPlay() {
		playback = !playback;

		if (playback) {
			//audio[0].play();

			button_play.addClass("icon-pause shrink active").removeClass("icon-play pulse").attr('title', 'Pause');
			$("body").addClass("play").removeClass("pause");

			fx = "hueani";
		} else {
			//audio[0].pause();
			button_play.addClass("icon-play pulse").removeClass("icon-pause shrink active").attr('title', 'Play');

			$("body").addClass("pause").removeClass("play");

			fx = "sw";
		}

		event.preventDefault();
	}

	function audioMute() {
		if (audio[0].muted == false) {
			audio[0].muted = true;

			button_mute.addClass("icon-unmute active").removeClass("icon-mute").attr('title', 'Unmute');
			$("body").addClass("mute").removeClass("unmute");
		} else {
			audio[0].muted = false;

			if (audio[0].volume <= 0) {
				audio[0].volume = audio_volume + 0.75;
			}

			button_mute.addClass("icon-mute").removeClass("icon-unmute active").attr('title', 'Mute');
			$("body").addClass("unmute").removeClass("mute");
		}

		event.preventDefault();
	}

	function audioVolumePlus() {
		audio_volume = audio[0].volume;

		if (audio_volume != 1) {
			try {
				audio[0].volume = audio_volume + 0.02;
				if (audio[0].muted == true) audioMute();
			} catch(err) {
				audio[0].volume = 1;
				console.log(err);
			}

			if (audio_volume != 0) {
				button_mute.addClass("icon-mute").removeClass("icon-unmute active");
			}
		}

		event.preventDefault();
	}

	function audioVolumeMinus() {
		audio_volume = audio[0].volume;

		if (audio_volume != 0) {
			try {
				audio[0].volume = audio_volume - 0.02;
			} catch(err) {
				audio[0].volume = 0;
				console.log(err);
			}
		} else {
			button_mute.addClass("icon-unmute active").removeClass("icon-mute");
		}

		event.preventDefault();
	}

	/**
	 * Playlist
	 */
	function playlist() {
		var audio    = $("audio"),
			playlist = $("#playlist"),
			current  = 0,
			tracks   = playlist.find("li a"),
			len      = tracks.length;

		audio[0].addEventListener("ended", function(e) {
			current++;

			if (current == len) {
				current = 0;
				link    = playlist.find("a")[0];
			} else {
				link = playlist.find("a")[current];    
			}

			run($(link), audio[0]);
		});

		playlist.find("a").click(function(e) {
			e.preventDefault();
			link    = $(this);
			current = link.parent().index();
			run(link, audio[0]);
		});
	}

	function run(link, player) {
		player.src = link.attr("href");
		par        = link.parent();
		par.addClass("active").siblings().removeClass("active");
		audio[0].load();

		if (playback) {
			audio[0].play();
		}
	}

})();
