package main

import (
    "github.com/gin-gonic/gin"
    "gopkg.in/olahol/melody.v1"
    "net/http"
    "strconv"
    "strings"
    "sync"
    "fmt"
    "time"
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

    mrouter.Upgrader.ReadBufferSize = 8192
    mrouter.Upgrader.WriteBufferSize = 8192
    mrouter.Upgrader.HandshakeTimeout = 10 * time.Second
    mrouter.Config.MaxMessageSize = 8192
    mrouter.Config.MessageBufferSize = 8192

    router.Static("/js", "./js")
    router.Static("/css", "./css")

    router.GET("/", func(c *gin.Context) {
        http.ServeFile(c.Writer, c.Request, "index.html")
    })

    router.GET("/ws", func(c *gin.Context) {
        mrouter.HandleRequest(c.Writer, c.Request)
    })

    mrouter.HandleError(func(s *melody.Session, err error){
        fmt.Println("ERROR ERROR")
        fmt.Println(err)
    })

    mrouter.HandleMessageBinary(func(s *melody.Session, binmsg []byte) {
        fmt.Println("BINARY MESSAGE")
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
        if p[0] == "Draw" {
            info := gophers[s]
            mrouter.BroadcastOthers([]byte("set "+info.ID+" "+p[1]+" "+p[2]+" "+p[3]+" "+p[4]), s)
        } else {
            mrouter.BroadcastOthers(msg, s)
        }
        lock.Unlock()
    })

    go clearTimer(mrouter)

    router.Run(":5000")

}

func clearTimer(mrouter *melody.Melody) {
    for {
        time.Sleep(10 * time.Second)
        mrouter.Broadcast([]byte("clear"))
    }
}
