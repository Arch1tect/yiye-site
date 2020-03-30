import React, { useEffect, useRef, useState } from "react"
import "antd/dist/antd.css"

import "./App.css"
import samePageIcon from "./icon.png"

import Room from "./Room"
import { Resizable } from "re-resizable"

import spConfig from "./cfg"

const url = window.location.href
function App() {
	const iframeRef = useRef()
	const [connected, setConnected] = useState(false)
	const [showIframe, setShowIframe] = useState(true)

	const [readyToLoadIframe, setReadyToLoadIframe] = useState(false)
	const postMsgToIframe = (type, data) => {
		iframeRef.current.contentWindow.postMessage(
			{
				type: type,
				data: data
			},
			"*"
		)
	}
	useEffect(() => {
		const socket = new WebSocket("wss://" + spConfig.socketUrl)
		socket.onmessage = e => {
			const msg = JSON.parse(e.data)
			if (!msg) return
			postMsgToIframe("sp-socket", msg)
		}
		// socketManager.connect(true)
		socket.onopen = e => {
			// window.spDebug("websocket connected")
			// window.spDebug(e)
			// if (_isConnected()) {
			// 	_joinRoom(triggeredByChatbox)
			// } else {
			// 	window.spDebug("websocket not connected?")
			// }
			setConnected(true)
		}
		window.addEventListener(
			"message",
			e => {
				if (!e || !e.data) return
				const data = e.data
				if (data.type === "sp-socket") {
					if (data.data === "disconnect socket") {
						// socketManager.disconnect()
					}
					socket.send(JSON.stringify(data.data))
				}
				if (data === "minimize") {
					setShowIframe(false)
				}
				if (data.action === "updateStorage") {
					console.log("update storage")
					const stringValue = JSON.stringify(data.value)
					localStorage.setItem(data.key, stringValue)

					const storageEvent = document.createEvent("HTMLEvents")
					storageEvent.initEvent("storage", true, true)
					storageEvent.eventName = "storage"
					storageEvent.key = data.key
					storageEvent.newValue = stringValue
					window.dispatchEvent(storageEvent)
					// window.spDebug("updateStorage")
					// window.spDebug(data)
					// storage.set(data.key, data.value)
				}
				if (data.action === "sp-parent-data") {
					// spDebug("post config & account to chatbox")
					const data = {
						spConfig: spConfig
					}
					postMsgToIframe("sp-parent-data", data)
					// postMsgToIframe("sp-parent-data", {
					// 	spConfig: spConfig,
					// 	// pass account to chatbox to get the latest token
					// 	account: accountManager.getAccount(),
					// 	blacklist: blacklistRef.current
					// })
				}
			},
			false
		)
	}, [])
	return (
		<div className="App">
			{!showIframe && (
				<img
					onClick={() => {
						setShowIframe(true)
					}}
					alt="Same Page"
					draggable="false"
					className="sp-chat-icon"
					src={samePageIcon}
				/>
			)}
			{readyToLoadIframe && connected && showIframe && (
				<Resizable
					enable={{
						top: false,
						right: true,
						bottom: true,
						left: false,
						topRight: false,
						bottomRight: false,
						bottomLeft: false,
						topLeft: false
					}}
					defaultSize={{
						width: 400,
						height: "100%"
					}}
					minWidth={300}
				>
					<iframe
						allow="autoplay"
						allowFullScreen={true}
						webkitallowfullscreen="true"
						mozallowfullscreen="true"
						title="same page chat box"
						ref={iframeRef}
						className="sp-chatbox-iframe"
						src={`${spConfig.chatboxSrc}?${url}`}
					/>
				</Resizable>
			)}
			{connected && <Room setReadyToLoadIframe={setReadyToLoadIframe} />}
		</div>
	)
}

export default App
