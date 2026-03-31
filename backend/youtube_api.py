"""
YouTube Data API v3 integration.
Handles video uploads and channel analytics.
"""

import os
import requests
from typing import Optional
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError


class YouTubeAPI:
    """Wrapper around YouTube Data API v3."""

    def __init__(self, api_key: str, credentials=None):
        """
        api_key: Used for read-only operations (analytics).
        credentials: google.oauth2.credentials.Credentials for upload operations.
        """
        self.api_key = api_key
        self.credentials = credentials
        self._read_service = build("youtube", "v3", developerKey=api_key) if api_key else None

    def _auth_service(self):
        """Build an authenticated service for write operations."""
        if not self.credentials:
            raise ValueError("OAuth2 credentials required for upload operations")
        return build("youtube", "v3", credentials=self.credentials)

    # ------------------------------------------------------------------
    # Publishing
    # ------------------------------------------------------------------

    def upload_video(
        self,
        file_path: str,
        title: str,
        description: str = "",
        tags: Optional[list] = None,
        category_id: str = "22",
        privacy_status: str = "public",
    ) -> dict:
        """
        Upload a video to YouTube.
        file_path must be a local path to the video file.
        """
        if not os.path.isfile(file_path):
            return {"success": False, "error": f"File not found: {file_path}"}

        try:
            service = self._auth_service()

            body = {
                "snippet": {
                    "title": title,
                    "description": description,
                    "tags": tags or [],
                    "categoryId": category_id,
                },
                "status": {
                    "privacyStatus": privacy_status,
                    "selfDeclaredMadeForKids": False,
                },
            }

            media = MediaFileUpload(file_path, chunksize=10 * 1024 * 1024, resumable=True)
            request = service.videos().insert(part="snippet,status", body=body, media_body=media)

            response = None
            while response is None:
                _, response = request.next_chunk()

            return {"success": True, "data": response}

        except HttpError as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Analytics
    # ------------------------------------------------------------------

    def get_channel_stats(self, channel_id: Optional[str] = None) -> dict:
        """Fetch channel statistics: views, subscribers, video count."""
        try:
            if not self._read_service:
                return {"success": False, "error": "API key not configured"}

            params = {"part": "statistics,snippet"}
            if channel_id:
                params["id"] = channel_id
            else:
                params["mine"] = True
                # need auth for 'mine'
                service = self._auth_service() if self.credentials else self._read_service
                resp = service.channels().list(**params).execute()
                items = resp.get("items", [])
                if not items:
                    return {"success": False, "error": "No channel found"}
                return {"success": True, "data": items[0]}

            resp = self._read_service.channels().list(**params).execute()
            items = resp.get("items", [])
            if not items:
                return {"success": False, "error": "No channel found"}
            return {"success": True, "data": items[0]}

        except HttpError as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    def get_top_videos(self, channel_id: str, max_results: int = 10) -> dict:
        """Fetch top videos by view count for a channel."""
        try:
            if not self._read_service:
                return {"success": False, "error": "API key not configured"}

            search_resp = self._read_service.search().list(
                part="snippet",
                channelId=channel_id,
                order="viewCount",
                type="video",
                maxResults=max_results,
            ).execute()

            video_ids = [item["id"]["videoId"] for item in search_resp.get("items", [])]
            if not video_ids:
                return {"success": True, "data": []}

            videos_resp = self._read_service.videos().list(
                part="snippet,statistics",
                id=",".join(video_ids),
            ).execute()

            return {"success": True, "data": videos_resp.get("items", [])}

        except HttpError as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    def get_recent_videos(self, channel_id: str, max_results: int = 20) -> dict:
        """Fetch recent videos for analytics display."""
        try:
            if not self._read_service:
                return {"success": False, "error": "API key not configured"}

            search_resp = self._read_service.search().list(
                part="snippet",
                channelId=channel_id,
                order="date",
                type="video",
                maxResults=max_results,
            ).execute()

            video_ids = [item["id"]["videoId"] for item in search_resp.get("items", [])]
            if not video_ids:
                return {"success": True, "data": []}

            videos_resp = self._read_service.videos().list(
                part="snippet,statistics,contentDetails",
                id=",".join(video_ids),
            ).execute()

            return {"success": True, "data": videos_resp.get("items", [])}

        except HttpError as exc:
            return {"success": False, "error": str(exc)}
        except Exception as exc:
            return {"success": False, "error": str(exc)}
