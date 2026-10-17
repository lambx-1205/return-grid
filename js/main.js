// Main menu interaction for RETURN GRID.
"use strict";

const startButton = document.querySelector("#start-button");

if (startButton) {
  startButton.addEventListener("click", () => {
    startButton.disabled = true;
    const label = startButton.querySelector(".button-label");
    if (label) label.textContent = "INITIALIZING...";

    // A brief transition makes the navigation feel deliberate without delaying it noticeably.
    window.setTimeout(() => {
      window.location.href = "experiment.html";
    }, 140);
  });
}
