import React, { useState, useEffect, useRef } from "react"
import { List, Card, Avatar, Collapse } from "antd"
import { Resizable } from "re-resizable"

import Player from "./MusicPlayer"

const { Panel } = Collapse
const { Meta } = Card

function Room() {
	const [room, setRoom] = useState()
	const playerRef = useRef()
	useEffect(() => {
		// no clean up assuming this component never
		// gets unmounted
		window.addEventListener("storage", storageEvent => {
			// key;          // name of the property set, changed etc.
			// oldValue;     // old value of property before change
			// newValue;     // new value of property after change
			// url;          // url of page that made the change
			// storageArea;  // localStorage or sessionStorage,
			// depending on where the change happened.
			if (storageEvent.key === "room") {
				const room = JSON.parse(storageEvent.newValue)
				console.log(room)
				setRoom(room)
			}
		})
	}, [])

	useEffect(() => {
		if (!room) return
		const bgImgUrl = `url("${room.background}")`
		document.body.style.backgroundImage = bgImgUrl
		if (room.media) {
			playerRef.current.playlist(room.media)
			playerRef.current.playlist.currentItem(0)
			playerRef.current.playlist.autoadvance(0)
		}
	}, [room])
	if (!room) return <span />

	return (
		<div>
			{room.media && (
				<div>
					<Resizable
						// handleClasses={{ bottom: "sp-resizable-bottom-handle" }}
						// style={resizableStyle}
						// size={{
						// width: "100%"
						// height: resizableHeight
						// }}
						enable={{
							top: false,
							right: true,
							bottom: true,
							left: true,
							topRight: false,
							bottomRight: false,
							bottomLeft: false,
							topLeft: false
						}}
						defaultSize={{
							width: "100%",
							height: 400
						}}
						minHeight={30}
					>
						<Player playerRef={playerRef} />
					</Resizable>
				</div>
			)}
			<Card
			// style={{ width: 300 }}
			// cover={<img src={room.cover} />}
			>
				<Meta
					avatar={<Avatar src={room.owner.avatarSrc} />}
					title={room.name}
					description={room.about}
				/>
			</Card>
			{room.media && (
				<div>
					<Collapse defaultActiveKey={["playlist"]}>
						<Panel header="播放列表" key="playlist">
							<List
								grid={{
									gutter: 16,
									xs: 1,
									sm: 3,
									md: 5,
									lg: 10,
									xl: 10,
									xxl: 10
								}}
								style={{ marginLeft: 25 }}
								dataSource={room.media}
								renderItem={(m, index) => (
									<List.Item>
										<span
											onClick={() => {
												playerRef.current.playlist.currentItem(
													index
												)
												playerRef.current.playlist.autoadvance(
													0
												)
												playerRef.current.play()
											}}
											className="playlist-entry"
										>
											{m.name}
										</span>
									</List.Item>
								)}
							/>
						</Panel>
					</Collapse>
				</div>
			)}
		</div>
	)
}

export default Room
