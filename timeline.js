function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // flash effect on click
        console.log("Copied:", text);
    }).catch(err => {
        console.error("Copy failed:", err);
    });
}


// State
let sentEvents = [];
let inboxEvents = [];
let markedSenders = new Set();
let excludedSenders = new Set();
let imageEvents = [];

let browserEvents = []; 

document.getElementById("image-input").addEventListener("change", async (event) => {
    const files = event.target.files;
    for (const file of files) {
        const timestamp = new Date(file.lastModified).toISOString(); 
        imageEvents.push({
            name: file.name,
            file: file,
            timestamp: timestamp
        });
    }
    renderTimeline(); 
});

document.getElementById("apply-filter").onclick = () => {
    renderTimeline();
};

document.getElementById("reset-filter").onclick = () => {
    document.getElementById("filter-from").value = "";
    document.getElementById("filter-to").value = "";
    renderTimeline(); 
};


function loadJSON(fileInput, targetArray) {
    fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
        try {
            targetArray.length = 0;
            const data = JSON.parse(e.target.result);
            targetArray.push(...data);
            renderTimeline();
        } catch(err) {
            alert("Invalid JSON file");
        }
        };
        reader.readAsText(file);
    });
}

loadJSON(document.getElementById("json-sent"), sentEvents);
loadJSON(document.getElementById("json-inbox"), inboxEvents);

loadJSON(document.getElementById("json-browser"), browserEvents); 


// Add address to exclude list
document.getElementById("add-exclude").onclick = () => {
    const input = document.getElementById("exclude-input");
    const value = input.value.trim().toLowerCase();
    if (value) {
        excludedSenders.add(value);
        input.value = "";
        updateExcludedList();
        renderTimeline();
    }
};

// Add sender to marked list
document.getElementById("add-mark").onclick = () => {
    const input = document.getElementById("mark-input");
    const value = input.value.trim().toLowerCase(); // normalize
    if(value) {
        markedSenders.add(value);
        input.value = "";
        updateMarkedList();
        renderTimeline();
    }
};

function updateExcludedList() {
    const div = document.getElementById("excluded-list");
    div.innerHTML = "<strong>Excluded:</strong><br>";

    excludedSenders.forEach(sender => {
        const line = document.createElement("div");
        line.textContent = sender;
        line.style.cursor = "pointer";

        line.onmouseover = () => line.style.color = "#ff8080";
        line.onmouseout  = () => line.style.color = "";

        // Click → remove
        line.onclick = () => {
            excludedSenders.delete(sender);
            updateExcludedList();
            renderTimeline();
        };

        div.appendChild(line);
    });
}


function updateMarkedList() {
    const div = document.getElementById("marked-list");
    div.innerHTML = "<strong>Marked:</strong><br>";

    markedSenders.forEach(sender => {
        const line = document.createElement("div");
        line.textContent = sender;
        line.style.cursor = "pointer";

        // Hover highlight
        line.onmouseover = () => line.style.color = "#ff8080";
        line.onmouseout  = () => line.style.color = "";

        // Click → remove
        line.onclick = () => {
            markedSenders.delete(sender);
            updateMarkedList();
            renderTimeline();
        };

        div.appendChild(line);
    });
}



function renderTimeline() {
    const timeline = document.getElementById("timeline");
    timeline.innerHTML = ""; // clear timeline


    const fromInput = document.getElementById("filter-from").value;
    const toInput   = document.getElementById("filter-to").value;

    let fromTime = fromInput ? new Date(fromInput).getTime() : null;
    let toTime   = toInput   ? new Date(toInput).getTime() : null;

    // filter events by range
    const filteredInbox = inboxEvents.filter(e => {
        const t = new Date(e.timestamp).getTime();
        return (!fromTime || t >= fromTime) && (!toTime || t <= toTime);
    });
    const filteredSent = sentEvents.filter(e => {
        const t = new Date(e.timestamp).getTime();
        return (!fromTime || t >= fromTime) && (!toTime || t <= toTime);
    });
    const filteredImages = imageEvents.filter(e => {
        const t = new Date(e.timestamp).getTime();
        return (!fromTime || t >= fromTime) && (!toTime || t <= toTime);
    });

    //We need to flatten this to be able to calculate time, since we store timestamps in an array
    const flatBrowserEvents = browserEvents.flatMap(e =>
        e.timestamps.map(ts => ({
            type: "browser",
            title: e.title,
            url: e.url,
            visit_count: e.visit_count,
            timestamp: ts
        }))
    );

    const filteredBrowser = flatBrowserEvents.filter(e => {
        const t = new Date(e.timestamp).getTime();
        return (!fromTime || t >= fromTime) && (!toTime || t <= toTime);
    });




    //console.log(filteredImages); 
    //console.log(filteredBrowser); 

    //const filteredSent = sentEvents;
    //const filteredInbox = inboxEvents;
    const allEvents = [...filteredSent, ...filteredInbox, ...filteredImages, ...filteredBrowser];
    if(allEvents.length === 0) return;

    console.log(allEvents); 


    // Normalize the timeline
    const times = allEvents.map(e => new Date(e.timestamp).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const duration = maxTime - minTime;

    function xPos(t) {
        return ((t - minTime) / duration) * 100;
    }

    // Add date labels (overview)
    const labelCount = 5;
    const step = (maxTime - minTime) / (labelCount - 1);
    const labelTimes = Array.from({length: labelCount}, (_, i) => minTime + i * step);

    for (const t of labelTimes) {
        const label = document.createElement("div");
        label.className = "label";
        label.style.left = ((t - minTime) / duration) * 100 + "%";
        label.textContent = new Date(t).toLocaleDateString();
        timeline.appendChild(label);
    }

    // Inbox dots (below)
    for (const e of inboxEvents) {
        const t = new Date(e.timestamp).getTime();
        const dot = document.createElement("div");
        dot.classList.add("dot", "dot-inbox");

        const sender = e.sender?.trim().toLowerCase();

        // Excluded → skip rendering
        if (sender && excludedSenders.has(sender)) continue;

        // Marked → boost
        if (sender && markedSenders.has(sender)) {
            dot.classList.add("dot-marked", "marked-boost");
        }


        dot.style.left = xPos(t) + "%";

        const bodyPreview = e.body ? e.body.replace(/\n/g, ' ').slice(0, 200) + (e.body.length > 200 ? "…" : "") : "";

        dot.title =
            `From: ${e.sender}\n` +
            `Subject: ${e.subject}\n` +
            `Date: ${e.timestamp}\n\n${bodyPreview}`;

        dot.onclick = () => {
            const sender = e.sender?.trim() || "";
            if (sender) copyToClipboard(sender);
        };

        timeline.appendChild(dot);
    }

    // Sent dots (top)
    for (const e of sentEvents) {
        const t = new Date(e.timestamp).getTime();
        const dot = document.createElement("div");
        dot.classList.add("dot", "dot-sent");

        // --- Exclude by RECEIVER ---
        let isExcluded = false;
        let isMarked = false;

        if (Array.isArray(e.receivers)) {
            for (const r of e.receivers) {
                const clean = r.trim().toLowerCase();
                if (excludedSenders.has(clean)) {
                    isExcluded = true;
                    break;
                }
                if (markedSenders.has(clean)) {
                    isMarked = true;
                }
            }
        }

        if (isExcluded) continue;


        if (isMarked) {
            dot.classList.add("dot-marked", "marked-boost");
        }

        dot.style.left = xPos(t) + "%";

        const bodyPreview = e.body ? e.body.replace(/\n/g, ' ').slice(0, 200) + (e.body.length > 200 ? "…" : "") : "";

        dot.title =
            `From: ${e.sender}\n` +
            `To: ${Array.isArray(e.receivers) ? e.receivers.join(", ") : "?"}\n` +
            `Subject: ${e.subject}\n` +
            `Date: ${e.timestamp}\n\n${bodyPreview}`;

        dot.onclick = () => {
            let toCopy = "";
            if (Array.isArray(e.receivers)) {
                toCopy = e.receivers.join(", ");
            }
            if (toCopy) copyToClipboard(toCopy);
        };

        timeline.appendChild(dot);

    }

    // Image dots (middle)
    for (const img of imageEvents) {
        const t = new Date(img.timestamp).getTime();
        const dot = document.createElement("div");
        dot.classList.add("dot");

        dot.style.left = xPos(t) + "%";
        dot.style.top = "0px"; // middle
        dot.classList.add("dot-image");


        dot.title = `Image: ${img.name}\nDate: ${img.timestamp}`;

        dot.onclick = () => {
            const url = URL.createObjectURL(img.file);
            window.open(url);
        };

        timeline.appendChild(dot);
    }

    // Browser dots (bottom)
    for (const event of flatBrowserEvents) {
        const t = new Date(event.timestamp).getTime();

        const dot = document.createElement("div");
        dot.classList.add("dot", "dot-browser");
        dot.style.left = xPos(t) + "%";
        dot.style.top = "40px";


        dot.title =
            `${event.title}\n` +
            `${event.url}\n` +
            `Visits: ${event.visit_count}\n` +
            `Date: ${event.timestamp}`;


        dot.onclick = () => window.open(event.url);

        timeline.appendChild(dot);
    }

}
