package main

import (
    "github.com/gin-gonic/gin"
    "gopkg.in/olahol/melody.v1"
    "net/http"
    "strconv"
    "strings"
    "sync"
)

type GopherInfo struct {
    ID string
}

func main() {
    router := gin.Default()
    mrouter := melody.New()
    gophers := make(map[*melody.Session] *GopherInfo)
    lock := new(sync.Mutex)
    counter := 0 //接続した順にIDが振られる

    router.Static("/js", "./js")
    router.Static("/css", "./css")

    router.GET("/", func(c *gin.Context) {
        http.ServeFile(c.Writer, c.Request, "index.html")
    })

    router.GET("/ws", func(c *gin.Context) {
        mrouter.HandleRequest(c.Writer, c.Request)
    })

    mrouter.HandleConnect(func(s *melody.Session) {
        lock.Lock()
        //Goの構造体あるある　最初広げないと使えないやつだと思う
        for _, info := range gophers {
            s.Write([]byte("set " + info.ID))
        }
        //ここで初期値の書き込み
        gophers[s] = &GopherInfo{strconv.Itoa(counter)}
        s.Write([]byte("iam " + gophers[s].ID))
        counter += 1 //IDのインクリメント
        lock.Unlock()
    })

    mrouter.HandleDisconnect(func(s *melody.Session) {
        lock.Lock()
        mrouter.BroadcastOthers([]byte("dis "+gophers[s].ID), s)
        //gophersのs番目削除
        delete(gophers, s)
        lock.Unlock()
    })

  //ox oyはユーザーだけが知っとけばいい　必要な時だけ投げてくれって感じ
    mrouter.HandleMessage(func(s *melody.Session, msg []byte) {
        p := strings.Split(string(msg), " ")
        lock.Lock()
        info := gophers[s]
        if len(p) == 4 {
            mrouter.BroadcastOthers([]byte("set "+info.ID+" "+p[0]+" "+p[1]+" "+p[2]+" "+p[3]), s)
        }
        lock.Unlock()
    })

    router.Run(":5000")

}
