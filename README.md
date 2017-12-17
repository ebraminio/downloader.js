A basic implementation of multipart in-browser downloader using Blob and URL APIs.

It downloads a file on 4 concurrent requests and shows the progress also. Please note that it seems setting `range` header might generally not a good idea on XHR requests, have a look at [this topic](https://stackoverflow.com/questions/15561508).

While downloading:

[![while downloading][1]][1]

After the download:

[![After the download][2]][2]

Another interesting topic would be implementing Pause/Resume functionality from Mega. XHR API of current browsers doesn't offer that capability so the only chance you have is to do multiple small sized chunks downloading and giving up on the downloaded part of your small chunks, the way it seems is done on Mega also.

(mentioned on [stackoverflow](https://stackoverflow.com/a/47855217) also)

  [1]: https://i.stack.imgur.com/3tPLN.png
  [2]: https://i.stack.imgur.com/QpFTP.png
