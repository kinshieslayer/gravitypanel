"""
TikTok Content Posting API integration.
Handles video publishing and analytics via the official TikTok API.
"""

import os
import requests
from typing import Optional


BASE_URL = "https://open.tiktokapis.com/v2"


class TikTokAPI:
    """Wrapper around the TikTok Content Posting API."""

    def __init__(self, access_token: str):
        self.access_token = access_token

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    # ------------------------------------------------------------------
    # Publishing
    # ------------------------------------------------------------------

    def publish_video(self, file_path: str, title: str, description: str = "",
                      privacy_level: str = "PUBLIC_TO_EVERYONE") -> dict:
        """
        Publish a video to TikTok using the Content Posting API (direct post).
        Steps:
        1) Initialize upload → get upload_url
        2) Upload video file to upload_url
        3) TikTok processes and publishes
        """
        if not os.path.isfile(file_path):
            return {"success": False, "error": f"File not found: {file_path}"}

        try:
            file_size = os.path.getsize(file_path)

            # Step 1 – Initialize upload
            init_resp = requests.post(
                f"{BASE_URL}/post/publish/inbox/video/init/",
                headers=self._headers(),
                json={
                    "post_info": {
                        "title": title,
                        "description": description,
                        "privacy_level": privacy_level,
                        "disable_duet": False,
                        "disable_comment": False,
                        "disable_stitch": False,
                    },
                    "source_info": {
                        "source": "FILE_UPLOAD",
                        "video_size": file_size,
                        "chunk_size": file_size,
                        "total_chunk_count": 1,
                    },
                },
                timeout=60,
            )
            init_resp.raise_for_status()
            init_data = init_resp.json().get("data", {})
            upload_url = init_data.get("upload_url")
            publish_id = init_data.get("publish_id")

            if not upload_url:
                return {"success": False, "error": "No upload URL returned from TikTok"}

            # Step 2 – Upload video
            with open(file_path, "rb") as video_file:
                upload_resp = requests.put(
                    upload_url,
                    headers={
                        "Content-Range": f"bytes 0-{file_size - 1}/{file_size}",
                        "Content-Type": "video/mp4",
                    },
                    data=video_file,
                    timeout=300,
                )
                upload_resp.raise_for_status()

            return {
                "success": True,
                "data": {"publish_id": publish_id, "upload_response": upload_resp.status_code},
            }

        except requests.RequestException as exc:
            return {"success": False, "error": str(exc)}

    def check_publish_status(self, publish_id: str) -> dict:
        """Check the status of a video publish operation."""
        try:
            resp = requests.post(
                f"{BASE_URL}/post/publish/status/fetch/",
                headers=self._headers(),
                json={"publish_id": publish_id},
                timeout=30,
            )
            resp.raise_for_status()
            return {"success": True, "data": resp.json().get("data", {})}
        except requests.RequestException as exc:
            return {"success": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Analytics
    # ------------------------------------------------------------------

    def get_user_info(self) -> dict:
        """Fetch basic user info: display name, follower count, etc."""
        try:
            resp = requests.get(
                f"{BASE_URL}/user/info/",
                headers=self._headers(),
                params={
                    "fields": "open_id,union_id,avatar_url,display_name,follower_count,following_count,likes_count,video_count",
                },
                timeout=30,
            )
            resp.raise_for_status()
            return {"success": True, "data": resp.json().get("data", {}).get("user", {})}
        except requests.RequestException as exc:
            return {"success": False, "error": str(exc)}

    def get_video_list(self, max_count: int = 20, cursor: Optional[int] = None) -> dict:
        """Fetch list of user's videos with basic stats."""
        try:
            body: dict = {
                "max_count": max_count,
                "fields": "id,title,create_time,cover_image_url,share_url,view_count,like_count,comment_count,share_count,duration",
            }
            if cursor is not None:
                body["cursor"] = cursor

            resp = requests.post(
                f"{BASE_URL}/video/list/",
                headers=self._headers(),
                json=body,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json().get("data", {})
            return {
                "success": True,
                "data": {
                    "videos": data.get("videos", []),
                    "cursor": data.get("cursor"),
                    "has_more": data.get("has_more", False),
                },
            }
        except requests.RequestException as exc:
            return {"success": False, "error": str(exc)}

    def get_video_analytics(self, video_ids: list) -> dict:
        """Fetch detailed analytics for specific videos."""
        try:
            resp = requests.post(
                f"{BASE_URL}/video/query/",
                headers=self._headers(),
                json={
                    "filters": {"video_ids": video_ids},
                    "fields": "id,title,create_time,view_count,like_count,comment_count,share_count",
                },
                timeout=30,
            )
            resp.raise_for_status()
            return {"success": True, "data": resp.json().get("data", {}).get("videos", [])}
        except requests.RequestException as exc:
            return {"success": False, "error": str(exc)}
