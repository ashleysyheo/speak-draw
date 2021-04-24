let SpeechRecognition;
let SpeechRecognitionEvent;

interact('.draggable')
    .draggable({
        inertia: true,
        modifiers: [
            interact.modifiers.restrictRect({
                restriction: 'parent',
                endOnly: true
            })
        ],
        autoScroll: true,

        listeners: {
            move: dragMoveListener,
        }
    })

function dragMoveListener (event) {
    var target = event.target

    var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
    var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy

    target.style.webkitTransform = target.style.transform = 'translate(' + x + 'px, ' + y + 'px)'

    target.setAttribute('data-x', x)
    target.setAttribute('data-y', y)
}

window.dragMoveListener = dragMoveListener;

let url, databse;
let drawButton, saveButton, cancelButton;
let speak, result, userHistory;
let today;
let drawingSaves = [];
let randomStrokes = [];
let randomStrokeColors = [];

let messages = [];
let randomColors = [];
let randomFontSizes = [];
let writingPositions = [];
let inputTimes = [];
let inputOrder = [];
let times = [];

let currDrawing = [];
let currStrokeIndex = [];
let xPoints = [];
let yPoints = [];
let i = 0;
let value;
let valueWords;
let valueWordsIdx = 0;
let randomStroke, randomColor;
let writing = false;
let chromeBrowser;
let userValue;
let startDraw = false;

let x, y;
let strokeIndex = 0;
let index = 0;
let drawing;
let prevx, prevy;
let randomPositionX, randomPositionY;
let randomNumberX, randomNumberY;
let randomWritingPosX, randomWritingPosY;
let xPos, yPos;
let xPositions = [];
let yPositions = [];
let recognition;
let hand1, hand2, hand3;
let aboutDisplay = false;

function preload() {
    hand1 = loadFont('font/hand-1.otf');
    hand2 = loadFont('font/hand-2.otf');
    hand3 = loadFont('font/hand-3.otf');
}

const checkBrowser = () => {
    let userAgentString = navigator.userAgent;
    let chromeAgent = userAgentString.indexOf("Chrome") > -1;

    return chromeAgent
}

window.onload = () => {
    let browser = checkBrowser();
    if (!browser) document.title = 'Write, Draw!';
};

function setup() {
    let canvas = createCanvas(6400, 4000);
    canvas.parent('main');
    document.querySelector('canvas').classList.add('draggable');

    let a = document.querySelector('canvas')
    a.onmousemove = getPos;

    // firebase configuration 
    let firebaseConfig = {
        apiKey: "AIzaSyBzwVo_VCGoIQ0JD0JPC3QzOTnoTeLpzes",
        authDomain: "speak-draw.firebaseapp.com",
        databaseURL: "https://speak-draw-default-rtdb.firebaseio.com/",
        projectId: "speak-draw",
        storageBucket: "speak-draw.appspot.com",
        messagingSenderId: "645625281276",
        appId: "1:645625281276:web:da290a48c0a80950193579",
        measurementId: "G-ZBNS4F8TV2"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    firebase.analytics();
    database = firebase.database();

    let ref = database.ref('userDrawings');
    ref.once('value', gotData, err);

    today = getTime();

    drawButton = document.getElementById('button-draw');
    drawButton.onclick = newDrawing;

    saveButton = document.getElementById('button-save');
    saveButton.onclick = saveDrawings;

    cancelButton = document.getElementById('button-cancel');
    cancelButton.onclick = cancel;

    speak = document.getElementById('speak-draw');

    userHistory = document.getElementById('user-history');

    // check browser
    chromeBrowser = checkBrowser();

    let speakContainer = document.querySelector('.speak-draw--texts');
    let instruction = document.querySelector('#speak');
    
    if (chromeBrowser) {
        // chrome
        SpeechRecognition = webkitSpeechRecognition;
        SpeechRecognitionEvent = webkitSpeechRecognitionEvent;

        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;

        instruction.innerHTML = 'Speak!';
        result = document.createElement('p');
        result.id = 'speech-result';
        result.className = 'result';
        result.innerHTML = '. . .'
        speakContainer.appendChild(result);
    } else {
        // firefox, safari, etc. 
        instruction.innerHTML = 'Write!';
        result = document.createElement('input');
        result.id = 'write-input';
        result.className = 'result';
        result.type = 'text';
        result.autocomplete = 'off';
        result.placeholder = '. . .';
        speakContainer.appendChild(result);

        result.addEventListener('keyup', e => {
            if (e.key === 'Enter') {
                showResult(result.value);
                result.value = '';
            }
        });
    }

    let hr = (new Date()).getHours();
    if (hr < 6 || hr > 18) {
        background(0, 0, 0);
        document.body.style.color = 'white';
        document.body.style.backgroundColor = '#171717';
        speak.style.backgroundColor = 'rgba(255, 255, 255, .1)';
        cancelButton.classList.add('dark-button');
    } else {
        background(255, 255, 255);
    }
}




const newDrawing = e => {    
    if (chromeBrowser) {
        recognition.start();
        recognition.onresult = showResult;
    } else {
        result.focus();
    }

    drawButton.style.display = 'none';
    saveButton.style.display = 'block';
    cancelButton.style.display = 'block';
    speak.style.opacity = 1;
    speak.style.pointerEvents = 'auto';
    result.style.cursor = 'auto';
}

const getURL = (keyword) => {
    let url = `https://quickdrawfiles.appspot.com/drawing/${keyword}?key=AIzaSyC1_soqtXV1mTyetVpJ4GglGD5RtXuFp4o&isAnimated=true&format=canvas%20drawing`;
    return url
};

const showResult = (event) => {
    let speechLength, idx, speechResult, resultString;

    let time = currDateTime();
    let time2 = getTime();

    if (chromeBrowser) {
        speechLength = event.results.length;
        idx = speechLength - 1;
        speechResult = event.results[idx][0];
        resultString = speechResult.transcript;

        let result = document.querySelector('.result');
        result.innerHTML = resultString;
    } else {
        resultString = event;
    }

    value = resultString.trim();
    let valueLowerCase = value.toLowerCase();

    let valueWordsCapitalize = value.split(' ');
    let valueWordsCapitalized = [];

    for (let i=0; i<valueWordsCapitalize.length; i++) {
        valueWordsCapitalized[i] = valueWordsCapitalize[i].capitalize();
    }

    valueWordsCapitalized = valueWordsCapitalized.join(' ');

    if (categories.includes(valueLowerCase)) {
        messages.push(value.toLowerCase());
        url = getURL(value.toLowerCase());
    } else if (categories.includes(valueWordsCapitalized)) {
        messages.push(value.capitalize());
        url = getURL(value.capitalize());
    } else {
        valueWords = value.split(' ');
        valueWords = valueWords.filter(ele => categories.includes(ele)); 

        if (valueWords.length !== 0) {
            messages.push(valueWords[0]);
            url = getURL(valueWords[0]);
        }
    }

    if (valueWords) {
        if (valueWords && valueWords.length === 0) {
            gotDrawing(value);
            inputTimes.push(time);
            times.push(time2);
            inputOrder.push('writing');
        } else {
            loadJSON(url, gotDrawing, err); 
            inputTimes.push(time);
            times.push(time2);
            inputOrder.push('drawing');
        }
    } else {
        loadJSON(url, gotDrawing, err);
        inputTimes.push(time);
        times.push(time2);
        inputOrder.push('drawing');
    }
}

function draw() {    
    if (drawing) {
        x = drawing[strokeIndex][0][index] + randomPositionX;
        y = drawing[strokeIndex][1][index] + randomPositionY;

        if (x && y) {
            xPoints.push(x);
            yPoints.push(y);
        }

        stroke(randomColor);
        strokeWeight(randomStroke);

        if (prevx !== undefined) {
            line(prevx, prevy, x, y);
        }

        index++;

        if (index >= drawing[strokeIndex][0].length) {
            currStrokeIndex[0] = xPoints;
            currStrokeIndex[1] = yPoints;
            currDrawing[strokeIndex] = currStrokeIndex;

            // reset 
            xPoints = [];
            yPoints = [];
            currStrokeIndex = [];

            strokeIndex++;
            prevx = undefined;
            prevy = undefined;
            index=0;

            if (strokeIndex === drawing.length) {
                drawingSaves.push(currDrawing);
                randomStrokeColors.push(randomColor);
                randomStrokes.push(randomStroke);

                drawing = undefined;
                currDrawing = [];
                strokeIndex = 0;

                valueWordsIdx++;

                if (valueWords !== undefined) {
                    if (valueWordsIdx === valueWords.length) {
                        drawing = undefined;
                        strokeIndex = 0;
                        valueWordsIdx = 0;
                    } else {
                        messages.push(valueWords[valueWordsIdx]);
                        url = getURL(valueWords[valueWordsIdx])
                        loadJSON(url, gotDrawing, err); 
                        inputTimes.push(currDateTime());
                        times.push(getTime());
                        inputOrder.push('drawing');
                    }
                }
            } 
        } else {
            prevx = x;
            prevy = y;
        }
    } else if (writing) {
        let fontSize = getRandomFontSize();

        noStroke();
        fill(randomColor);
        textFont(hand2);
        textSize(fontSize);
        text(value, randomWritingPosX, randomWritingPosY);

        messages.push(value);
        randomColors.push(randomColor);
        randomFontSizes.push(fontSize);
        writingPositions.push([randomWritingPosX, randomWritingPosY]);

        writing = false;
        valueWords = undefined;
    }
}

const gotDrawing = (data) => {
    if (valueWords) {
        if (valueWords.length === 0) {
            writing = true;
        }
    }
 
    drawing = data.drawing;

    let siteWidth = document.body.clientWidth;
    xPositions.push(xPos);

    let siteHeight = document.body.clientHeight;
    yPositions.push(yPos);

    // Random Position for Writing
    let writingMinX = xPositions[0] - Math.floor(siteWidth / 2) + 10;
    let writingMaxX = xPositions[0] + Math.floor(siteWidth / 3);
    randomWritingPosX = getRndInteger(writingMinX, writingMaxX);


    let writingMinY = yPositions[0] - siteHeight + 250;
    let writingMaxY = yPositions[0] - 10; 
    randomWritingPosY = getRndInteger(writingMinY, writingMaxY);

    // Random Position for Drawing 
    let drawingMinX = xPositions[0] - siteWidth + Math.floor(siteWidth / 5);
    let drawingMaxX = xPositions[0] - Math.floor(siteWidth / 2);
    randomPositionX = getRndInteger(drawingMinX, drawingMaxX);


    let drawingMinY = yPositions[0] - siteHeight + Math.floor(siteHeight / 5);
    let drawingMaxY = yPositions[0] - Math.floor(siteHeight / 3);
    randomPositionY = getRndInteger(drawingMinY, drawingMaxY);

    randomStroke = getRandomStroke();
    randomColor = getRandomColor();
}

const cancel = () => {
    drawButton.style.display = 'block';
    saveButton.style.display = 'none';
    cancelButton.style.display = 'none';
    speak.style.opacity = 0;
    speak.style.pointerEvents = 'none';
    result.style.cursor = 'move';

    if (chromeBrowser) {
        recognition.stop();
        result.innerHTML = '. . .';
    } else {
        result.value = '';
    }

    inputOrder = [];
    inputTimes = [];
    messages = [];
    randomColors = [];
    randomFontSizes = [];
    writingPositions = [];
    randomStrokeColors = [];
    randomStrokes = [];
    drawingSaves = [];
    xPositions = [];
    yPositions = [];
}

const saveDrawings = () => {
    drawButton.style.display = 'block';
    saveButton.style.display = 'none';
    cancelButton.style.display = 'none';
    speak.style.opacity = 0;
    speak.style.pointerEvents = 'none';
    result.style.cursor = 'move';

    if (chromeBrowser) {
        recognition.stop();
        result.innerHTML = '. . .';
    } else {
        result.value = '';
    }

    let ref = database.ref('userDrawings');

    while (inputOrder.length > 0) {
        let currOrder = inputOrder.shift();
        let data = {
            type: currOrder,
            time: inputTimes.shift(),
            message: messages.shift(),
            time_ms: times.shift(),
        }

        if (currOrder === 'writing') {
            data.info = {
                fill_color: randomColors.shift(),
                font_size: randomFontSizes.shift(),
                position: writingPositions.shift(),
            }
        } else {
            data.info = {
                stroke_color: randomStrokeColors.shift(), 
                stroke_weight: randomStrokes.shift(),
                drawing: drawingSaves.shift(),
            }
        }
        // console.log(data);
        ref.push(data);
    }

    xPositions = [];
    yPositions = [];
}

const loadDrawings = (data) => {
    let type = data.type;
    let timeDifference = getTimeDifference(today, data.time_ms);

    if (timeDifference < 15) {
        if (type === 'writing') {
            noStroke();
            fill(data.info.fill_color);
            textFont(hand2);
            textSize(data.info.font_size);
            text(data.message, data.info.position[0], data.info.position[1]);
        } else {
            let loadedDrawing = data.info.drawing;

            for (let path of loadedDrawing) {
                noFill();
                stroke(data.info.stroke_color);
                strokeWeight(data.info.stroke_weight);
                beginShape();
                for (let i=0; i<path[0].length; i++) {
                    let x = path[0][i];
                    let y = path[1][i];
        
                    vertex(x,y);
                }
                endShape();
            }
        }
    }
}

const loadHistory = data => {
    let history = document.createElement('div');
    history.className = 'history';
    userHistory.appendChild(history);

    let message = document.createElement('p');
    history.appendChild(message);
    message.className = 'message';
    message.innerHTML = data.message;
    data.type === 'writing' ? message.style.color = data.info.fill_color : message.style.color = data.info.stroke_color;

    let typeTime = document.createElement('p');
    history.appendChild(typeTime);
    typeTime.className = 'typeTime';
    typeTime.innerHTML = `${data.type} ${data.time[0]} ${data.time[1]}`;
}

const gotData = (data) => {
    let drawings = data.val();
    let keys = Object.keys(drawings);

    for (let i=0; i<keys.length;i++) {
        let key = keys[i];
        let reverseKey = keys[keys.length-i-1];
        loadDrawings(drawings[key]);
        loadHistory(drawings[reverseKey]);
    }
}

const err = (err) => {
    alert(err);
    console.log(err);
}

const getPos = (e) =>{
    xPos = e.offsetX;
    yPos = e.offsetY;
}

const getRandomStroke = () => {
    return Math.floor(Math.random() * (11 - 3) + 3);
}

const getRandomColor = () => {
    let h = getRndInteger(0, 358); 
    let s = getRndInteger(75, 100); 
    let l = getRndInteger(33, 78); 

    let color = `hsl(${h}, ${s}%, ${l}%)`;
    return color;
}

const getRandomFontSize = () => {
    return Math.floor(Math.random() * (120 - 30) + 30);
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

const currDateTime = () => {
    let today = new Date();
    let time = `${today.getHours()}`.padStart(2, '0') + ":" + `${today.getMinutes()}`.padStart(2, '0') + ":" + `${today.getSeconds()}`.padStart(2, '0');
    let date = today.getFullYear()+'/'+(today.getMonth()+1)+'/'+today.getDate();

    return [date, time];
}

const getTime = () => {
    let time = new Date().getTime();

    return time;
}

const getTimeDifference = (a, b) => {
    let differenceInTime = a - b;
    let differenceInDays = differenceInTime / (1000 * 3600 * 24);

    return differenceInDays;
}

const getRndInteger = (min, max) => {
    return Math.floor(Math.random() * (max - min) ) + min;
}

const showAbout = self => {
    let about = document.querySelector('.about-container');
    let title = document.querySelector('#title');
    let description = document.querySelector('.desc');
    let instruction = document.querySelector('.instruct');

    if (!chromeBrowser) title.innerHTML = 'Write, Draw!';


    if (!chromeBrowser) {
        title.innerHTML = 'Write, Draw!';
        description.innerHTML = `
        Write, Draw! is a collaborative canvas where you can draw along with anyone on the web by writing. 
        It utilises <a href="https://p5js.org/" target="_blank">p5.js</a> and takes drawings from the
        <a href="https://quickdraw.withgoogle.com/data" target="_blank">Quick, Draw!</a> dataset. 
        `;

        instruction.innerHTML = `
            You can draw by clicking the draw button in the middle and writing what you want to draw! +press ENTER</span>
        `
    }


    if (aboutDisplay === false) {
        self.innerHTML = 'x';
        aboutDisplay = true;
        about.style.display = 'block';
    } else {
        self.innerHTML = '?';
        aboutDisplay = false;
        about.style.display = 'none';
    }
}

const downloadCanvas = () => {
    saveCanvas('Speak, Draw!', 'jpg');
}