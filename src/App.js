import React from "react";
import axios from "axios";

import {
  Widget,
  toggleWidget,
  renderCustomComponent,
  addResponseMessage,
  setQuickButtons,
  addLinkSnippet,
  toggleMsgLoader,
} from "react-chat-widget";
import "react-chat-widget/lib/styles.css";
import "./App.css";

const BASE_URL = "/message";

class AudioComponent extends React.Component {
  render() {
    return (
      <audio
        controls="controls"
        className={this.props.isUserAudio ? "user-audio" : ""}
      >
        <source src={this.props.src} />
      </audio>
    );
  }
}

class App extends React.Component {
  state = { recording: false };
  recorder = undefined;
  audioChunks = [];

  handleNewUserMessage = async (text) => {
    toggleMsgLoader();
    try {
      const response = await axios.post(BASE_URL, {
        sender: "web",
        message: text,
      });

      response.data.forEach((item) => {
        const { text } = item;
        if (text) addResponseMessage(text);
      });
    } catch (e) {
      console.log(e.toString());
    }
    toggleMsgLoader();
  };

  handleQuickButtonClicked = async (value) => {
    switch (value) {
      // value === 0: "stop" button clicked
      case 0:
        // if it is recording, stop it
        if (this.state.recording) {
          this.recorder.stop();
        }
        this.setState({ recording: false });
        setQuickButtons([{ label: "RECORD", value: 1 }]);
        break;
      // value === 1: "record" button clicked
      case 1:
        // if not recording, start to record voice
        if (!this.state.recording) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });

          this.recorder = new MediaRecorder(stream);
          this.recorder.start();

          this.setState({ recording: true });
          setQuickButtons([{ label: "STOP", value: 0 }]);
          document.getElementsByClassName("quick-button")[0].className =
            "quick-button bd-red";

          // collect audio data into chunk
          this.audioChunks = [];
          this.recorder.addEventListener("dataavailable", (event) => {
            this.audioChunks.push(event.data);
          });

          // use collected data to form a blob object and play it
          this.recorder.addEventListener("stop", async () => {
            const audioBlob = new Blob(this.audioChunks);
            const audioUrl = URL.createObjectURL(audioBlob);
            renderCustomComponent(AudioComponent, {
              src: audioUrl,
              isUserAudio: true,
            });
          });
        } else {
          this.setState({ recording: false });
          setQuickButtons([{ label: "RECORD", value: 1 }]);
        }
        break;
      // error handling, should never reach here
      default:
        this.setState({ recording: false });
        setQuickButtons([{ label: "RECORD", value: 1 }]);
        break;
    }
  };

  componentDidMount() {
    toggleWidget();
    renderCustomComponent(
      AudioComponent,
      {
        src: "http://music.163.com/song/media/outer/url?id=1404885266.mp3",
      },
      true
    );
    addResponseMessage("Hello motherfucker");
    setQuickButtons([{ label: "RECORD", value: 1 }]);
    addLinkSnippet({
      title: "My awesome link",
      link: "https://github.com/Wolox/react-chat-widget",
      target: "_blank",
    });
  }

  render() {
    return (
      <Widget
        title="Hello MotherFucker"
        profileAvatar="/images/robot.png"
        handleNewUserMessage={this.handleNewUserMessage}
        handleQuickButtonClicked={this.handleQuickButtonClicked}
      />
    );
  }
}

export default App;
