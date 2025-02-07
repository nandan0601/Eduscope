import React, { FC, useEffect, useState } from "react";
import axios from "axios";

type Props = {
  videoUrl: string;
  title: string;
};

const CoursePlayer: FC<Props> = ({ videoUrl }) => {
  const [videoData, setVideoData] = useState({
    otp: "",
    playbackInfo: "",
  });

  useEffect(() => {
    // axios
    //   .post("https://EduScope-lms-7728bbd846c2.herokuapp.com/api/v1/getVdoCipherOTP", {
    //     videoId: videoUrl,
    //   })
    axios
      .post("http://127.0.0.1:8000/api/v1/getVdoCipherOTP", {
        videoId: videoUrl,
      })
      .then((res) => {
        setVideoData(res.data);
      });
  }, [videoUrl]);

  return (
    <div
      style={{ position: "relative", paddingTop: "56.25%", overflow: "hidden" }}
    >
      {videoData.otp && videoData.playbackInfo !== "" && (
        // <iframe
        //   src={`https://player.vdocipher.com/v2/?otp=${videoData?.otp}&playbackInfo=${videoData.playbackInfo}&player=B9zvyU5mhXwix1NZ`}
        //   style={{
        //     position: "absolute",
        //     top: 0,
        //     left: 0,
        //     width: "100%",
        //     height: "100%",
        //     border: 0
        //   }}
        //   allowFullScreen={true}
        //   allow="encrypted-media"
        // ></iframe>

        <iframe
          src={`https://player.vdocipher.com/v2/?otp=${videoData?.otp}&playbackInfo=${videoData?.playbackInfo}&player=B18XxsbYsH6UXAwA`}
          style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: 0
              }}
              allowFullScreen={true}
              allow="encrypted-media"
        ></iframe>
      )}
    </div>
  );
};

export default CoursePlayer;
