import React from "react";
import axios from "axios";

import {
  addResponseMessage,
  renderCustomComponent,
  setQuickButtons,
  toggleMsgLoader,
  toggleWidget,
  Widget,
} from "react-chat-widget";
import "react-chat-widget/lib/styles.css";
import "./App.css";

const MESSAGE_URL = "/message";
const AUDIO_URL = "/audio";
const MESSAGE2AUDIO_URL = "/message2audio";

const b64toBlob = (b64Data, contentType = "", sliceSize = 512) => {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
};

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

  renderAudioMessage = (src, isUserAudio = false) => {
    renderCustomComponent(AudioComponent, { src, isUserAudio }, !isUserAudio);
  };

  handleNewUserMessage = async (text) => {
    toggleMsgLoader();
    try {
      const response = await axios.post(MESSAGE_URL, {
        sender: "web",
        message: text,
      });

      console.log(response);

      response.data.forEach((item) => {
        const { text, attachment, attachment_base64 } = item;

        // text response
        if (text) addResponseMessage(text);

        // attachment response, refers to music url
        if (attachment) this.renderAudioMessage(attachment);

        // base64 attachment response, refers to wav file from server
        if (attachment_base64) {
          const blob = b64toBlob(attachment_base64, "audio/wav");
          const blobUrl = URL.createObjectURL(blob);
          this.renderAudioMessage(blobUrl);
        }
      });
    } catch (e) {
      console.log(e.toString());
    }
    toggleMsgLoader();
  };

  handleRecorderStopped = async () => {
    const audioBlob = new Blob(this.audioChunks, {
      type: "audio/wav; codecs=0",
    });

    // render audio player as user message
    const audioUrl = URL.createObjectURL(audioBlob);
    this.renderAudioMessage(audioUrl, true);
    toggleMsgLoader();

    // sender the audio blob to server
    let formData = new FormData();
    formData.append("name", "webAudioBlob");
    formData.append("file", audioBlob);

    try {
      const response = await axios.post(AUDIO_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log(response);

      response.data.forEach((item) => {
        const { text, attachment, audio } = item;

        // text response
        if (text) addResponseMessage(text);

        // attachment response, refers to music url
        if (attachment) this.renderAudioMessage(attachment);

        // base64 attachment response, refers to wav file from server
        if (audio) {
          const blob = b64toBlob(audio, "audio/wav");
          const blobUrl = URL.createObjectURL(blob);
          this.renderAudioMessage(blobUrl);
        }
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

          // do something when recorder is stopped
          this.recorder.addEventListener("stop", this.handleRecorderStopped);
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
    this.renderAudioMessage(
      "http://music.163.com/song/media/outer/url?id=1404885266.mp3"
    );
    addResponseMessage("Hello, this is rasa bot");
    setQuickButtons([{ label: "RECORD", value: 1 }]);
  }

  render() {
    return (
      <Widget
        title="Hello World"
        subtitle="music playing and weather querying"
        profileAvatar="/images/robot.png"
        handleNewUserMessage={this.handleNewUserMessage}
        handleQuickButtonClicked={this.handleQuickButtonClicked}
      />
    );
  }
}

export default App;
