# PolyU Shuttle 下一班

網站：https://sisuben.github.io/polyu-shuttle-bus/

根據用戶提供的 2026–27 年 PolyU / CPCE Shuttle Bus 時間表，查詢 WK、理大本部、HHB 各上車站的下一班開出時間。時間表只涵蓋指定服務期的星期一至五，公眾假期除外。這是按時間表計算，並非即時車輛 GPS 到站預測；路況、停駛或學校更改安排可能影響實際班次。

網站是純靜態 HTML/CSS/JavaScript。`dist/schedule.js` 保存班次和服務期；`dist/holidays.json` 由[香港政府 1823 公眾假期 iCal](https://www.1823.gov.hk/tc/hong-kong-public-holidays-ical)建立。若官方更新時間表，須同步更新服務期和班次，再重新部署。當本時間表在 2027 年 7 月 30 日結束，網站會顯示「時間表已過期」。

本地預覽：

```sh
python3 -m http.server 8765 --directory dist
```

然後開啟 `http://127.0.0.1:8765/`。

推送到 `main` 後，[GitHub Actions](./.github/workflows/pages.yml) 會自動發布 `dist/` 到 GitHub Pages。更新時間表時，修改 `dist/schedule.js` 後推送即可。
