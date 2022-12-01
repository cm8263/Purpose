/* global _, SimpleNotification, GamePad */

//
// Variables
//

// Game Version
const version = "2.0.0";
// API URL Root
const apiUrl = "https://purpose-game.com/api/";
// Keys that progress the story
const progressKeys = [13, 32, 38, 39, 40];
// Custom HTML Tags
const customTags = "ui, character, special, action, speech, sound, music, stopmusic, killmusic, flashback, choices, rumble, wait";
// Save Options UI
const saveOptions = `
<div class="menu-options">
	<div class="option-one"><img id="option-one" href="javascript:void(0)" class="sound-click" onclick="window.story.saveGame(true)"></div>
	<div class="option-two"><img id="option-two" href="javascript:void(0)" class="sound-click" onclick="window.story.pauseMenu()"></div>
</div>
`;
// UI Styles
const uiStyles = {
	// Standard UI
	standard: `
		<div class="container">

			${saveOptions}

			<div class="character-left">
				<img id="character-one-image" class="character-slot">
			</div>

			<div class="character-right">
				<img id="character-two-image" class="character-slot">
			</div>

			<div class="text-area">
				<div class="character-name character-name-left">
					<img class="character-name">
					<div id="character-one"></div>
				</div>

				<div class="character-name character-name-right">
					<img class="character-name">
					<div id="character-two"></div>
				</div>

				<div class="text-area-main">
					<img>
				</div>
			</div>

		</div>
	`,

	// Special UI
	special: `
		<div class="container">

			${saveOptions}

			<div class="character-left">
				<img id="character-one-image" class="character-slot">
			</div>

			<div class="special-right">
				<img id="special-image" class="special-image">
			</div>

			<div class="text-area">
				<div class="character-name character-name-left">
					<img class="character-name">
					<div id="character-one"></div>
				</div>

				<div class="text-area-special">
					<img>
				</div>
			</div>

		</div>
	`,

	minimal: `
		<div class="container">

			<div class="text-area">
				<div class="text-area-minimal">
					<img>
				</div>
			</div>

		</div>
	`,
}
// Body Element
const body = $("body");
// Audio Library
const audioLibrary = {
	// UI Sounds
	ui: {
		button: new Audio("assets/audio/ui/button.mp3"),
		click: new Audio("assets/audio/ui/click.mp3"),
		confirm: new Audio("assets/audio/ui/confirm.mp3")
	},

	// Sound effects
	sfx: {
		// Diegetic
		"knocking": new Audio("assets/audio/sfx/knocking.mp3"),
		"collapse": new Audio("assets/audio/sfx/collapse.mp3"),
		"bedroom": new Audio("assets/audio/sfx/bedroom.mp3"),
		"bed": new Audio("assets/audio/sfx/bed.mp3"),
		"behind-door": new Audio("assets/audio/sfx/behind_door.mp3"),
		"chair": new Audio("assets/audio/sfx/chair.mp3"),
		"chair2": new Audio("assets/audio/sfx/chair2.mp3"),
		"bowl": new Audio("assets/audio/sfx/bowl.mp3"),

		// Non-diegetic
		"stinger": new Audio("assets/audio/sfx/non-diegetic/stinger.mp3")
	},

	// Music
	music: {
		// Menu Music
		menu: {
			main_menu: new Audio("assets/audio/music/menu/main_menu.mp3"),
			pause_menu: new Audio("assets/audio/music/menu/pause_menu.mp3"),
		},
		
		// Game Music
		"limping": new Audio("assets/audio/music/limping.mp3"),
		"flashback": new Audio("assets/audio/music/flashback.mp3"),
		"sofa": new Audio("assets/audio/music/sofa.mp3"),
		"calm": new Audio("assets/audio/music/calm.mp3"),
	}
}

// Shows debug notification when true
let debug = false;
// Shows achievement notifications when true
let achievements = true;
// Uses custom font when true
let font = true;
// Prevents saving of last saved page
let justSaved = false;

let debugNotification;
let saveNotification;

let prePausePassage;

let images;
let uiType;
let speaker;
let lastText;
let textArea;
let steps = [];
let inFlashback;
let originalImages;
let currentStep = 0;
let lastTextStep = 0;
let typewriting = [];
let maxChoiceIndex = 0;
let keybindSelectedElement;
let currentChoiceIndex = -1;

let menuMusic;
let backgroundMusic;
let killFade = false;

window.story.version = version;

// Current Chapter, i.e. "Chapter1"
window.story.state.chapter = "";
window.story.state.choices = {};
window.story.state.achievements = {};

window.story.player = {};
window.story.player.name = "Player";
window.story.player.id = "0";
window.story.player.key = "0";

// If Cloud Saving is enabled
window.story.saving = false;
window.story.saveSlot = 1;
// If game is being played online
window.story.network = false;
// Is player making a choice
window.story.makingChoice = false;

// Used for statistics passages, see "Choices" passage for all choices
//	"Choice Internal Name": [
//		You and X% of players:
//		"did some actions or made some choice",
//		You and X% of players:
//		"did some opposite actions or made some other choice"
//	],
window.story.choiceDescriptions = {
	"": {
		// Empty for debugging
	},
	"Chapter1": {
		"Lied": [
			"lied to Lucy about how you hurt your leg",
			"told Lucy the truth about how you hurt your leg"
		],
		"NewPurpose": [
			"told yourself you needed to find a new purpose in life",
			"told yourself you have no purpose in life and should die"
		],
		"Laughed": [
			"found the time to have a laugh",
			"did not find the time to have a laugh"
		],
		"Tiffany": [
			"called Tiffany by her full name",
			"called Tiffany by the nickname you made"
		],
		"Haircut": [
			"gave yourself a haircut",
			"passed up the opportunity for a haircut"
		],
		"WillHelp": [
			"told Lucy people will help Tiffany in her time of need",
			"told Lucy people will not help Tiffany in her time of need"
		],
		"Protect": [
			"chose to protected Tiffany",
			"chose to investigate the noise"
		],
		"SaveStranger": [
			"went outside to save the stranger",
			"stayed inside and tried to keep the stranger out"
		],
		"LucySavesStranger": [
			"influenced Lucy to save the stranger",
			"influenced Lucy to try and keep the stranger out"
		],
		"TriedToSaveLucy": [
			"tried to save Lucy, but let Tiffany watch her die",
			"did as Lucy asked, saved Tiffany from watching her die"
		],
		"StrangerDied": [
			"watched the stranger die",
			"left with the stranger"
		]
	}
};

// Used for achievements and end passages 
//	"Achievement Internal Name": [
//		"Achievement Name", "Achievement Description"
//	],
window.story.achievementDescriptions = {
	"": {
		// Empty for debugging
	},
	"Chapter1": {
		"Knocked": [
			"Knock, knock", "Who's *there?*"
		],
		"Soap": [
			"Nothing wasted", "You never know when it will come in handy!"
		],
		"Filter": [
			"No Filter", "Speaking your mind, *even when you shouldn't.*"
		],
		"Nothing": [
			"Silent Treatment", "You have the right to remain silent..."
		],
		"NoChoice": [
			"Broken Record", "You need some new material."
		],
		"RollCredits": [
			"Roll Credits", "And that's a Sin."
		],
		"Drama": [
			"Drama Queen", "You should have been an actor."
		],
		"Walkers": [
			"Walkers?", "What do you call the ones that run?"
		],
		"Nerve": [
			"Struck a Nerve", "Found a touchy subject"
		],
		"Scorpion": [
			"Scorpion", "*Get over here*"
		]
	}
}

//
// Events
//

$(document).on("sm.passage.showing", function(_, data) {
	if (data.passage === undefined) return;
	
	const passage = data.passage;
	const twPassage = $("tw-passage");

	debugMessage(`Passage changed to ${passage.name}`);
	
	// Set browser tab name, doesn't work when inside iFrame
	$(document).attr("title", "Purpose - " + passage.name);
	// Scroll to top of screen on passage change for mobile users
	window.scrollTo(0, 0);

	if (debug) {
		if (!debugNotification) {
			debugNotification = SimpleNotification.message({
				title: "Alpha Build"
			}, {
				position: "bottom-right",
				sticky: true,
				closeButton: false,
				closeOnClick: false
			});
		}
		
		debugNotification.setText(`Content subject to change!\nCurrent Passage: \`\`${passage.name}\`\``);
	}

	if (passage.tags) {
		if (
			passage.tags.includes("forceFade") || (
				!passage.tags.includes("noFade") &&
				!passage.tags.includes("redirect") &&
				!passage.tags.includes("page")) &&
				!passage.tags.includes("variation")
			) {
			twPassage.hide(0).fadeIn(500);
		}

		if (window.story.saving && passage.tags.includes("save")) {
			// Stop saving of the page we just loaded back into
			if (justSaved) {
				debugMessage(`Not saving ${passage.name} as justLoaded is ${true}`);
				return;
			}

			debugMessage(`Game saved at ${passage.name}`);

			window.story.state.lastPassage = passage.name;
			window.story.saveGame();
		}
	}
});

$(document).on("sm.passage.shown", function(_, data) {
	const passage = data.passage;
    const twPassage = $("tw-passage");

	window.story.makingChoice = false;

    if (passage.tags && (passage.tags.includes("page") || passage.tags.includes("variation") || passage.tags.includes("redirect"))) {
		const pageHTML = twPassage.html();
		// Replace %Tiffany% with what the player chose to call Tiffany
		if (pageHTML.includes("%Tiffany%")) {
			twPassage.html(pageHTML.replaceAll("%Tiffany%", window.story.tiffany()));
		}

		if (twPassage.length) processPassage(twPassage);
    }
});

body.mouseover(function (e) {
	const element = $(e.target);

    if (!element.is("a") && !element.attr("class")?.includes("sound-")) return;

	if (keybindSelectedElement) {
		keybindSelectedElement.removeClass("hovered");
		keybindSelectedElement = null;
	}

	audioHelpers.playAudio(audioLibrary.ui.button);
});

body.click(function (e) {
	const element = $(e.target);
	const elementClass = element.attr("class");

    if (!element.is("a") && !elementClass?.includes("sound-")) {
		const ignoreClick = ["option-one", "option-two"];

		if (!ignoreClick.includes(e.target.id)) stepPassage();
	} else {
		switch (elementClass) {
			case "sound-confirm":
				audioHelpers.playAudio(audioLibrary.ui.confirm);
				break;
	
			default:
				audioHelpers.playAudio(audioLibrary.ui.click);
				break;
		}
	}
});

body.keyup(function (e) {
	if (!progressKeys.includes(e.keyCode)) return;

	if (!window.story.makingChoice) {
		stepPassage();
		return;
	}

	let oldChoiceIndex = currentChoiceIndex;

	if (currentChoiceIndex === -1 || !keybindSelectedElement) {
		currentChoiceIndex = 0;
	} else {
		$(`#choice-${currentChoiceIndex}`).removeClass("hovered");

		switch (e.keyCode) {
			// Enter
			case 13:
				$(`#choice-${currentChoiceIndex}`).trigger("click");
				return;

			// Up
			case 38:
				if (currentChoiceIndex > 0) --currentChoiceIndex;
				break;

			// Down
			case 40:
				if (currentChoiceIndex < maxChoiceIndex) currentChoiceIndex++;
				break;
		}
	}

	const currentElement = $(`#choice-${currentChoiceIndex}`);

	if (oldChoiceIndex != currentChoiceIndex) {
		audioHelpers.playAudio(audioLibrary.ui.click);
		GamePad.gamepadRumble(0.5, 0, 200);
	}

	currentElement.addClass("hovered");

	keybindSelectedElement = currentElement;
});

//
// Helpers
//

// Prints a debug message to the console if in debug mode
const debugMessage = (message) => { if (debug) console.log("DEBUG: " + message); };

// Delays script execution for X ms
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Audio functions
const audioHelpers = {
	play: (music) => {
		music.volume = 0;
		music.play();
		music.loop = true;

		audioHelpers.fadeIn(music);
	},

	// Duplicates audio then plays
	playAudio: (audio) => audio.cloneNode().play(),

	playMusic: async (audio) => {
		const music = audio.cloneNode();

		audioHelpers.play(music);

		return music;
	},

	togglePauseMusic: async (music) => {
		if (!music) return;

		if (music.paused) {
			audioHelpers.play(music);
		} else {
			await audioHelpers.killMusic(music);
		}
	},

	stopMusic: async (music) => {
		killFade = true;

		// Wait for any fade-ins to die
		sleep(550);

		killFade = false;

		audioHelpers.fadeOut(music);
	},

	killMusic: async (music) => {
		while (music.volume > 0) {
			music.volume = Math.max(0, music.volume - 0.1);
			
			await sleep(100);
		}

		music.pause();
	},

	fadeIn: async (music) => {
		while (!killFade && music.volume < 1) {
			music.volume = Math.min(1, music.volume + 0.025);

			await sleep(500);
		}
	},

	fadeOut: async (music) => {
		while (!killFade && music.volume > 0) {
			music.volume = Math.max(0, music.volume - 0.025);
			
			await sleep(125);
		}

		music.pause();
	}
};

async function stepPassage() {
	const storyBox = $(".story-box");
	const ui = uiType === "standard" ? "main" : uiType === "special" ? "special" : "minimal";

	if (typewriting.includes(lastTextStep)) {
		if (lastText) lastText.remove();

		const [type, content] = steps[lastTextStep];

		if (type === "SPEECH" && speaker && originalImages) {
			speaker.attr("class", "character-slot");
			speaker.css("background-image", originalImages.join(", "));
		}
		
		textArea.append(`<div ${inFlashback ? `class="italic" ` : ``}id="text-area-${ui}-${lastTextStep}-skipped">${type === "SPEECH" ? `"${content}"` : content}</div>`);

		lastText = $(`#text-area-${ui}-${lastTextStep}-skipped`);

		typewriting = typewriting.filter(i => i !== lastTextStep);

		debugMessage(`Skipped to end of passage ${lastTextStep}.`);
	} else if (steps[currentStep]) {
		const step = currentStep;
		
		let [type, content, extra] = steps[step];

		if (extra === "Tiff") extra = "Tiffany";
		if (content === "Tiff") content = "Tiffany";
		
		currentStep++;

		switch (type) {
			// Change the current UI layout
			case "UI":
				storyBox.empty();
				
				uiType = content.toLowerCase();

				switch (uiType) {
					case "standard":
						storyBox.append(uiStyles.standard);
						textArea = $(".text-area-main");
						break;

					case "special":
						storyBox.append(uiStyles.special);
						textArea = $(".text-area-special");
						break;

					case "minimal":
						storyBox.append(uiStyles.minimal);
						textArea = $(".text-area-minimal");
						break;
				}

				stepPassage();
				break;

			// Set a character to a slot
			case "CHARACTER": {
				const knownUnknown = content.startsWith("?");
				const extras = extra.split(" ");
				const slot = extras.shift();
				const character = (knownUnknown ? "Unknown" : content).toLowerCase();
				const mixer = document.createElement("span");
				
				mixer.id = "mixer-image";
				document.head.appendChild(mixer);
			
				let parts = [];
				let images = [];
				let parent = $(`#character-${slot}`);
				let mixerImage = $(`#mixer-image`);
				let parentImage = $(`#character-${slot}-image`);

				switch (extras.length) {
					case 0:
						parts = [
							`${character}-eyes-neutral`,
							`${character}-mouth-neutral`,
							`${character}-stance-neutral`
						];
						break;

					case 1:
						parts = [
							`${character}-eyes-${extras[0]}`,
							`${character}-mouth-${extras[0]}`,
							`${character}-stance-neutral`
						];
						break;

					case 2:
						switch (extras[1]) {
							case "solo":
								parts = [
									`${character}-eyes-${extras[0]}`,
									`${character}-mouth-neutral`,
									`${character}-stance-neutral`
								];
								break;

							case "ditto":
								parts = [
									`${character}-eyes-${extras[0]}`,
									`${character}-mouth-${extras[0]}`,
									`${character}-stance-${extras[0]}`
								];
								break;

							case "stance":
								parts = [
									`${character}-eyes-neutral`,
									`${character}-mouth-neutral`,
									`${character}-stance-${extras[0]}`
								];
								break;

							default:
								parts = [
									`${character}-eyes-${extras[0]}`,
									`${character}-mouth-${extras[1]}`,
									`${character}-stance-neutral`
								];
								break;	
						}						
						break;

					case 3:
						parts = [
							`${character}-eyes-${extras[0]}`,
							`${character}-mouth-${extras[1]}`,
							`${character}-stance-${extras[2]}`
						];
						break;
				}

				for (const part of parts) {
					mixerImage.attr("class", part);
					images.push(mixerImage.css("background-image"));
				}

				parent.text(knownUnknown ? content.substring(1) : content === "Unknown" ? "???" : content);
				parentImage.attr("class", "character-slot");
				parentImage.css("background-image", images.join(", "));
				mixerImage.remove();

				stepPassage();
				break;
			}

			// Set the special image for the Special UI
			case "SPECIAL":
				$("#special-image").attr("class", "special-image");
				$("#special-image").addClass(`${content.toLowerCase()}-image`);

				stepPassage();
				break;

			// Plays a sound effect
			case "SOUND":
				audioHelpers.playAudio(audioLibrary.sfx[content]);

				stepPassage();
				break;

			// Plays background music
			case "MUSIC":
				if (backgroundMusic) await audioHelpers.fadeOut(backgroundMusic);

				backgroundMusic = await audioHelpers.playMusic(audioLibrary.music[content]);

				stepPassage();
				break;

			// Stops background music
			case "STOPMUSIC":
				if (backgroundMusic) await audioHelpers.stopMusic(backgroundMusic);

				stepPassage();
				break;

			// Kills background music
			case "KILLMUSIC":
				if (backgroundMusic) await audioHelpers.killMusic(backgroundMusic);

				stepPassage();
				break;

			// Sets passage as a flashback passage
			case "FLASHBACK":
				inFlashback = true;

				stepPassage();
				break;

			// Trigger gamepad rumble
			case "RUMBLE": {
				GamePad.gamepadRumble(...content.split(" "));

				stepPassage();
				break;
			}

			// Pause passage progression
			case "WAIT": {
				await sleep(content);

				stepPassage();
				break;
			}

			// Handles SPEECH, ACTION, and CHOICES
			default: {
				let character;
				let specificSpeech = "";

				if (extra?.includes(" ")) {
					const extras = extra.split(" ");

					character = extras[0].toLowerCase() ?? "";
					specificSpeech = `-${extras[1].toLowerCase()}`;
				} else {
					character = extra?.toLowerCase() ?? "";
				}

				if (lastText) lastText.remove();

				if (type !== "CHOICES") typewriting.push(step);

				textArea.append(`<div ${inFlashback ? `class="italic" ` : ``}id="text-area-${ui}-${step}"></div>`);

				lastTextStep = step;
				lastText = $(`#text-area-${ui}-${step}`);

				let characterOne = $("#character-one").text().toLowerCase();
				let characterTwo = $("#character-two").text().toLowerCase();

				if (characterOne === "???") characterOne = "unknown";
				if (characterTwo === "???") characterTwo = "unknown";

				$("#character-one-image").css("opacity", character !== characterOne ? "0.6" : "1");
				$("#character-two-image").css("opacity", character !== characterTwo ? "0.6" : "1");
				
				lastText.html(type === "SPEECH" ? `"${content}"` : content);

				if (type !== "CHOICES") {
					if (type === "SPEECH") {
						speaker = $(`#character-${character === characterOne ? "one" : "two"}-image`)

						let backgroundImages = speaker.css("background-image");

						if (
							// Scared Tiffany has her mouth covered OR
							(character !== "Tiffany" && !backgroundImages.includes("stance/scared")) &&
							// Lucy has surgical mask on
							(character !== "Lucy" && !backgroundImages.includes("stance/neutral_mask")) &&
							// Known Unknown has no mouth
							(!backgroundImages.includes("unknown/neutral"))
						) {
							images = backgroundImages.split(", ");
							originalImages = images.slice();

							const mixer = document.createElement("span");

							mixer.id = "mixer-image";
							document.head.appendChild(mixer);

							let mixerImage = $(`#mixer-image`);

							mixerImage.attr("class", `${character}-mouth-talking${specificSpeech}`);
							images[1] = mixerImage.css("background-image");

							speaker.attr("class", "character-slot");
							speaker.css("background-image", images.join(", "));

							mixerImage.remove();
						} else {
							speaker = null;
						}
					}

					lastText.typeWrite({
						speed: 50,
						cursor: false,
						color: "#c8c3bc"
					}).then(() => {
						if (type === "SPEECH" && speaker && originalImages && typewriting.includes(step)) {
							speaker.attr("class", "character-slot");
							speaker.css("background-image", originalImages.join(", "));
						}

						typewriting = typewriting.filter(i => i !== step);
					});
				} else {
					currentChoiceIndex = -1;
					keybindSelectedElement = null;
					window.story.makingChoice = true;

					$(`#text-area-${ui}-${step} > p`).contents().unwrap();

					lastText.children().each((index, element) => {
						maxChoiceIndex = index;
						$(element).attr("id", `choice-${index}`);
						$(element).after("<br>");
					});
				}
				break;
			}
		}

		debugMessage(`Stepped through passage ${step}.`);
	}
}

function processPassage(twPassage) {
	steps = [];
	currentStep = 0;
	lastTextStep = 0;

	// Populate steps list
	twPassage.find(customTags).each(function() {
		const element = $(this);

		steps.push([element.prop("tagName"), element.html(), element.attr("class")]);
	});

	if (steps.length === 0) {
		alert("Passage incompatible.");
		debugMessage(`Failed to process passage, passage incompatible.`);
		return;
	}

	debugMessage(`Processed passage with ${steps.length} steps.`);

	twPassage.empty();
	twPassage.append(`<div class="story-box"></div>`);

	justSaved = false;
	inFlashback = false;

	stepPassage();
}

//
//	Window Helpers
//

// Checks network connection
window.story.networkCheck = function (nextPassage) {
	$.get(apiUrl + "status").done(function() {
		debugMessage("Connection to server made successfully");

		window.story.network = true;
	}).catch(function(error) {
		debugMessage("Connection to server failed: " + error);

		saveNotification = SimpleNotification.error({
			title: "Network Connection Failed!",
			text: "Could not connect to the remote server, Cloud Saving unavailable."
		}, {
			duration: 10 * 1000,
			position: "bottom-right"
		});
	// Show the next passage regardless
	}).then(function() {
		window.story.show(nextPassage);
	});
}

// Shows "No Connection" error message
window.story.noConnection = function () {
	saveNotification = SimpleNotification.error({
		title: "Network Connection Failed!",
		text: "Could not connect to the remote server, Cloud Saving unavailable."
	}, {
		duration: 10 * 1000,
		position: "bottom-right"
	});
}

// Redirects one passage to another after a given time
window.story.redirect = function (pageName, time = 5) {
	debugMessage(`Redirecting to ${pageName} in ${time} seconds`);

	let timeLeft = time;

	function tick() {
		if (--timeLeft === 0) window.story.show(pageName);

		_.delay(tick, 1000);
	}

	_.delay(tick, 1000);
};

// Displays text on screen after x period of time
window.story.delayedText = function (time = 1000, id = "delayed", fadeIn = 1000) {
	debugMessage(`Showing delayed text ${id} in ${time} milliseconds`);

	_.delay(function() {
		$(`#${id}`).fadeIn(fadeIn);
	}, time);
}

// Sets an achievement and shows a popup
window.story.achievement = function (chapter, shorthand, title, text) {
	try {
		if (window.story.state.achievements[chapter][shorthand]) {
			debugMessage(`Chapter ${chapter} achievement ${shorthand} already earned`);
			return;
		} else {
			debugMessage(`Chapter ${chapter} achievement ${shorthand} earned, showing ${achievements}`);
		}

		window.story.state.achievements[chapter][shorthand] = true;
	} catch (_) {
		window.story.state.achievements[chapter] = {};
		window.story.state.achievements[chapter][shorthand] = true;
	}

	if (achievements) {
		SimpleNotification.info({
			title: `Achievement: ${title}`,
			text,
		}, {
			duration: 10 * 1000,
			position: "bottom-right",
			closeButton: false,
			closeOnClick: false
		});
	}
};

// Sets a story choice
window.story.setChoice = function (chapter, choice, value = true) {
	debugMessage(`Chapter ${chapter} choice ${choice} set to ${value}`);

	try {
		window.story.state.choices[chapter][choice] = value;
	} catch (_) {
		window.story.state.choices[chapter] = {};
		window.story.state.choices[chapter][choice] = value;
	}
};

// Gets a story choice
window.story.getChoice = function (chapter, choice) {
	try {
		return window.story.state.choices[chapter][choice];
	} catch (_) {
		// TODO: Replace with an enum or similar, since
		// there are cases where the choice not being set
		// should result in a different action from the
		// choice being set to false
		return false;
	}
};

// Gets all the choices from a chapter
window.story.getChoices = function (chapter) {
	try {
		return Object.entries(window.story.state.choices[chapter]) || [];
	} catch (_) {
		return [];
	}
}

// Returns the name picked for Tiffany
window.story.tiffany = function () {
	try {
		return window.story.state.choices["Chapter1"]["TiffanyName"] || "Tiffany";
	} catch (_) {
		return "Tiffany";
	}
}

// Links a player's account to the current session
window.story.linkCode = function () {
	const input = $("#linkingCode");
	const button = $("#linkingCodeButton");
	const code = input.val();
	
	saveNotification = SimpleNotification.info({
		title: "Linking account"
	}, {
		position: "bottom-right"
	});
	
	input.prop("disabled", true);
	button.attr("onclick", "");
	
	if (!code || code === "") {
		debugMessage(`Empty linking code provided`);

		saveNotification.setType("error");
		saveNotification.setTitle("Error: No Code");
		saveNotification.setText("No code entered!");
		
		input.prop("disabled", false);
		button.attr("onclick", "window.story.linkCode()");
		return;
	}
	
	if (code.length != 9) {
		debugMessage(`Linking code wrong length`);

		saveNotification.setType("error");
		saveNotification.setTitle("Error: Invalid Code");
		saveNotification.setText("Entered code is invalid!");
		input.prop("disabled", false);
		button.attr("onclick", "window.story.linkCode()");
		return;
	}
	
	$.post(apiUrl + "link", {
		code
	}).done(function(data) {
		debugMessage(`Account linked with code ${code}`);

		saveNotification.setType("success");
		saveNotification.setTitle("Account Linked!");
		
		window.story.player.name = data.userName;
		window.story.player.id = data.userId;
		window.story.player.key = data.userKey;

		debugMessage(`Name: ${window.story.player.name}, ID: ${window.story.player.id}, User Key: ${window.story.player.key}`);
		
		window.story.saving = true;
		
		window.story.show("Linked");
	}).catch(function(error) {
		debugMessage(`Account failed to link with code ${code}: ` + error);

		SimpleNotification.error({
			title: `Error: ${error.status}`,
			text: error.responseText
		}, {
			position: "bottom-right"
		});

		input.prop("disabled", false);
		button.attr("onclick", "window.story.linkCode()");
	});
}

// Saves player's game
window.story.saveGame = function (manual = false) {
	if (!window.story.saving) {
		SimpleNotification.error({
			title: `Error: Saving Not Enabled`
		}, {
			position: "bottom-right"
		});
		return;
	}

	saveNotification = SimpleNotification.info({
		title: `${manual ? "" : "Auto-"}Saving...`
	}, {
		position: "bottom-right"
	});

	$.post(apiUrl + "save", {
		key: window.story.player.key,
		data: {
			saveSlot: window.story.saveSlot,
			saveData: JSON.stringify(window.story.state)
		}
	}).done(function() {
		debugMessage("Game saved");

		saveNotification.setType("success");
		saveNotification.setTitle(`${manual ? "" : "Auto-"}Save Complete!`);
	}).catch(function(error) {
		debugMessage("Game failed to save: " + error);

		saveNotification.setType("error");
		saveNotification.setTitle(`${manual ? "" : "Auto-"}Save Failed!`);
		saveNotification.setText(error.responseText);
	});
}

// Loads all player saves
window.story.loadSaves = function (newGame = false) {
	$.post(apiUrl + "saves", {
		key: window.story.player.key
	}).done(function(data) {
		debugMessage(`Loaded ${data.length} saves for ${window.story.player.key}`);

		$("#slotsLoading").hide();
		
		if (data.length === 0 && !newGame) {
			saveNotification = SimpleNotification.message({
				title: "No Saved Games!"
			}, {
				position: "bottom-right"
			});
			return;
		}

		if (!newGame) {
			$.each( data, function( _, value ) {
				const lastUsed = new Date(value.lastActive);
				$("#savesContainer").append(`<a onclick="window.story.loadSave(${value.slot})"><u>Save Slot ${value.slot}</u><br>Chapter: ${value.data.lastPassage.charAt(1)}<br>Last passage: ${value.data.lastPassage}<br>Last Used: ${lastUsed.toLocaleDateString()}</a>`);
			});
		} else {
			$.each( data, function( _, value ) {
				$("#saveSlot" + value.slot).text("Save Slot " + value.slot + " (In Use)");
			});
		}
		
		if (newGame) {
			$("#saveSlotSelector").fadeIn(500);	
		} else {
			$("#savesContainer").fadeIn(500);
		}
	}).catch(function(error) {
		debugMessage(`Failed to load saves for ${window.story.player.key}: ` + error);

		saveNotification = SimpleNotification.error({
			title: "Load Failed!",
			text: error.responseText
		}, {
			position: "bottom-right"
		});
	});
}

// Loads a player's save
window.story.loadSave = function (saveSlot) {
	window.story.show("Loading Save");

	saveNotification = SimpleNotification.info({
		title: "Loading Save..."
	}, {
		position: "bottom-right"
	});
	
	$.post(apiUrl + "load", {
		key: window.story.player.key,
		saveSlot: saveSlot,	
	}).done(function(data) {
		debugMessage(`Loaded save ${saveSlot} for ${window.story.player.key}`);

		justSaved = true;

		window.story.state = data;
		window.story.saveSlot = saveSlot;
		
		saveNotification.setType("success");
		saveNotification.setTitle("Save Loaded!");

		_.delay(function() {
			window.story.show(window.story.state.lastPassage);
		}, 1000);
	}).catch(function(error) {
		debugMessage(`Failed to load save ${saveSlot} for ${window.story.player.key}: ` + error);

		saveNotification.setType("error");
		saveNotification.setTitle("Load Failed!");
		saveNotification.setText(error.responseText);
		
		_.delay(function() {
			window.story.show("Saved Games");
		}, 1000);
	});
}

// Hides generate button and shows linking form
window.story.toggleLinkingDisplays = function (reverse = false) {
	debugMessage(`Linking buttons toggled (${reverse})`);
	
	if (!reverse) {
		$("#generateButton").hide();
		$("#linkingForm").show();
	} else {
		$("#generateButton").show();
		$("#linkingForm").hide();
	}
}

// Selects a slot of a new game, and starts new game
window.story.selectSlot = function () {
	debugMessage(`Starting game in save slot ${$("#slots").val()}`);

	window.story.saveSlot = $("#slots").val();
	
	saveNotification = SimpleNotification.info({
		title: "Save Slot " + window.story.saveSlot + " Selected"
	}, {
		position: "bottom-right"
	});
	
	_.delay(function() {
		window.story.show("C1 Intro");
	}, 1000);
}

// Toggles Debug Mode off
window.story.toggleDebug = function () {
	debugMessage(`Debug toggled (${!debug})`);

	debug = !debug;

	if (debug) {
		debugNotification = SimpleNotification.message({
			title: "Alpha Build",
			text: "Content subject to change!",
		}, {
			position: "bottom-right",
			sticky: true,
			closeButton: false,
			closeOnClick: false
		});
	} else {
		debugNotification.remove();
	}
	
	SimpleNotification.info({
		title: `Debug Mode ${debug ? "Enabled" : "Disabled"}`
	}, {
		duration: 2 * 1000,
		position: "bottom-right",
		closeButton: false,
		closeOnClick: false
	});
}

// Toggles Custom Font
window.story.toggleFont = function () {
	debugMessage(`Font toggled (${!font})`);

	font = !font;
	
	if (font) {
		body.css({
			"font-size": "unset",
			"font": "27px 'DeadWalking', Arial, sans-serif"
		});
	} else {
		body.css({
			"font": "unset",
			"font-size": "27px"
		});
	}
	
	SimpleNotification.info({
		title: `Font ${font ? "Enabled" : "Disabled"}`
	}, {
		duration: 2 * 1000,
		position: "bottom-right",
		closeButton: false,
		closeOnClick: false
	});
}

// Loads statistics
window.story.loadStats = function () {
	$.post(apiUrl + "stats", {
		key: window.story.player.key,
		chapter: window.story.state.chapter
	}).done(function(data) {
		debugMessage(`Loaded ${data.length} stats for chapter ${window.story.state.chapter} ${window.story.player.key}`);

		$("#statsLoading").hide();
		
		for (const stat in data) {
			if (
				!window.story.state.choices[window.story.state.chapter] ||
				// If choice was never set, not to be confused with choice being set to false
				!Object.prototype.hasOwnProperty.call(window.story.state.choices[window.story.state.chapter], stat)
			) {
				continue;
			}
			
			let message;
			
			if (window.story.getChoice(window.story.state.chapter, stat)) {
				message = `You and ${data[stat][0]} of players ${window.story.choiceDescriptions[window.story.state.chapter][stat][0]}`;
			} else {
				message = `You and ${data[stat][1]} of players ${window.story.choiceDescriptions[window.story.state.chapter][stat][1]}`;
			}
			
			$("#statsContainer").append(`<p>${message}</p><progress class="did-bar" value="${data[stat][0].slice(0, -1)}" max="100"></progress><br><progress class="did-not-bar" value="${data[stat][1].slice(0, -1)}" max="100"></progress>`);	
		}
		
		$("#statsContainer").fadeIn(500);
	}).catch(function(error) {
		debugMessage(`Failed to load stats for chapter ${window.story.state.chapter} ${window.story.player.key}`);

		saveNotification = SimpleNotification.error({
			title: "Load Failed!",
			text: error.responseText
		}, {
			position: "bottom-right"
		});
	});
}

// Loads achievements
window.story.loadAchievements = function () {
	// Fake loading to allow the passage to load or else jQuery won't make the changes
	_.delay(function() {
		$("#achievementsLoading").hide();

		let earnedAchievements = 0;
		const totalAchievements = Object.entries(window.story.achievementDescriptions[window.story.state.chapter]).length;

		$("#achievementsCounter").text(`${earnedAchievements}/${totalAchievements} Achievements Earned`);

		for (const [internal, [name, description]] of Object.entries(window.story.achievementDescriptions[window.story.state.chapter])) {
			if (!window.story.state.achievements[window.story.state.chapter] || !window.story.state.achievements[window.story.state.chapter][internal]) {
				continue;
			}

			$("#achievementsCounter").text(`${++earnedAchievements}/${totalAchievements} Achievements Earned`);

			$("#achievementsContainer").append(`<p>- <b>${name}</b>: ${description.replaceAll("*", "")}</p>`);
		}

		if (totalAchievements > 0) $("#achievementsContainer").append(`<hr>`);

		$("#achievementsCounter").fadeIn(500);
		$("#achievementsContainer").fadeIn(500);
	}, 1000);
}

// Toggles opening of pause menu
window.story.pauseMenu = async function () {
	debugMessage(`Pause menu toggled (${prePausePassage == null})`);

	if (prePausePassage == null) {
		prePausePassage = window.passage.name;

		window.story.show("Pause Menu");

		await audioHelpers.togglePauseMusic(backgroundMusic);

		window.story.startMenuMusic(true);
	} else {
		window.story.show(prePausePassage);
		window.story.stopMenuMusic(menuMusic);

		audioHelpers.togglePauseMusic(backgroundMusic);

		prePausePassage = null;
	}
}

// Toggles showing of achievements
window.story.toggleAchievements = function () {
	debugMessage(`Achievements toggled (${!achievements})`);

	achievements = !achievements;
	
	SimpleNotification.info({
		title: `Achievements ${achievements ? "Enabled" : "Disabled"}`
	}, {
		duration: 2 * 1000,
		position: "bottom-right",
		closeButton: false,
		closeOnClick: false
	});
}

// Renders a passage and replaces text
window.story.customRender = function (passageName) {
	const passage = window.story.passage(passageName);

	// Replace %Tiffany% with what the player chose to call Tiffany
	if (passage.source.includes("%Tiffany%")) {
		passage.source = passage.source.replaceAll("%Tiffany%", window.story.tiffany());
	}
	
	return window.story.render(passageName);
}

// Starts menu music
window.story.startMenuMusic = async function (pauseMenu = false) {
	if (menuMusic) await audioHelpers.killMusic(menuMusic);

	debugMessage("Main menu music started");

	menuMusic = await audioHelpers.playMusic(!pauseMenu ? audioLibrary.music.menu.main_menu : audioLibrary.music.menu.pause_menu);
}

// Stops the menu music
window.story.stopMenuMusic = async function () {
	if (!menuMusic) return;

	await audioHelpers.stopMusic(menuMusic);

	menuMusic = null;

	debugMessage("Main menu music stopped");
}

//
// Scripts
//

// Game Pad
const gamepad = document.createElement("script");
gamepad.src = "assets/javascript/gamepad.js";

document.head.appendChild(gamepad);

// Preload
const preload = document.createElement("script");
preload.src = "assets/javascript/preload.js";

const startPreload = () => document.head.appendChild(preload);

//
// External Scripts
//

// toggleFullscreen.js
// https://gist.github.com/demonixis/5188326
window.story.toggleFullscreen = function (event) {
	let element = document.documentElement;

	if (event instanceof HTMLElement) element = event;

	const isFullscreen = document.webkitIsFullScreen || document.mozFullScreen || false;

	debugMessage(`Fullscreen toggled (${!isFullscreen})`);

	element.requestFullScreen = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || function () { return false; };
	document.cancelFullScreen = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen || function () { return false; };

	isFullscreen ? document.cancelFullScreen() : element.requestFullScreen();
}

// SimpleNotification
// https://github.com/Glagan/SimpleNotification
// https://github.com/Glagan/SimpleNotification/blob/master/LICENSE
const simpleNotification = document.createElement("script");
simpleNotification.src = "assets/javascript/simpleNotification.min.js";

document.head.appendChild(simpleNotification);

// jquery-typewriter-plugin
// https://github.com/0xPranavDoshi/jquery-typewriter
// https://github.com/0xPranavDoshi/jquery-typewriter/blob/master/LICENSE
const typewriter = document.createElement("script");
typewriter.src = "assets/javascript/jquery.typewriter.min.js";

document.head.appendChild(typewriter);

///
/// Initialization
///

// Adds Favicons
$("head").append('<link rel="apple-touch-icon" sizes="180x180" href="assets/images/icons/apple-touch-icon.png"><link rel="icon" type="image/png" sizes="512x512" href="assets/images/icons/android-chrome-512x512.png"><link rel="icon" type="image/png" sizes="192x192" href="assets/images/icons/android-chrome-192x192.png"><link rel="icon" type="image/png" sizes="32x32" href="assets/images/icons/favicon-32x32.png"><link rel="icon" type="image/png" sizes="16x16" href="assets/images/icons/favicon-16x16.png">');

// Start preloading all images
startPreload();