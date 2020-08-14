package main

import (
    "github.com/gin-gonic/gin"
    "gopkg.in/olahol/melody.v1"
    "net/http"
    "strconv"
    "strings"
    "sync"
)

//idとox oyがいる
type GopherInfo struct {
    ID, OX, OY string
}

func main() {
    router := gin.Default()
    mrouter := melody.New()
    gophers := make(map[*melody.Session] *GopherInfo)
    lock := new(sync.Mutex)
    counter := 0 //接続した順にIDが振られる

    router.GET("/", func(c *gin.Context) {
        http.ServeFile(c.Writer, c.Request, "index.html")
    })

    router.GET("/ws", func(c *gin.Context) {
        mrouter.HandleRequest(c.Writer, c.Request)
    })

    /*
    TODO 構造体システム直す
    */
    mrouter.HandleConnect(func(s *melody.Session) {
        lock.Lock()
        //Goの構造体あるある　最初広げないと使えないやつだと思う
        for _, info := range gophers {
            s.Write([]byte("set " + info.ID + " " + info.OX + " " + info.OY))
        }
        //ここで初期値の書き込み
        gophers[s] = &GopherInfo{strconv.Itoa(counter), "0", "0"}
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

    //受信は2つか4つで分岐する(ox oy)　(ox oy x y)
    //送信を(set id ox oy x y)の6つかx y省略の4つにする
    mrouter.HandleMessage(func(s *melody.Session, msg []byte) {
        p := strings.Split(string(msg), " ")
        lock.Lock()
        info := gophers[s]
        if len(p) == 4 {
            mrouter.BroadcastOthers([]byte("set "+info.ID+" "+p[0]+" "+p[1]+" "+p[2]+" "+p[3]), s)
        } else if len(p) == 4 {
            info.OX = p[0]
            info.OY = p[1]
            mrouter.BroadcastOthers([]byte("set "+info.ID+" "+info.OX+" "+info.OY+" "+p[2]+" "+p[3]), s)
        }
        lock.Unlock()
    })

    router.Run(":5000")

}
