package main

import (
    "github.com/gin-gonic/gin"
    "gopkg.in/olahol/melody.v1"
    "github.com/jinzhu/gorm"
    "net/http"
    "strconv"
    "strings"
    "sync"
    "fmt"
    "time"
)

type Score struct {
    gorm.Model
    ScoreA int
    ScoreB int
}

func dbInit() {
    db, err := gorm.Open("sqlite3", "engagement.sqlite3")
    if err != nil {
        fmt.Println("dbinit: Can not open database")
    }
    db.AutoMigrate(&Score{})
    defer db.Close()
}

func dbInsert(scoreA int, scoreB int) {
    db, err := gorm.Open("sqlite3", "engagement.sqlite3")
    if err != nil {
        fmt.Println("dbInsert: Can not open database")
    }
    db.Create(&Score{ScoreA: scoreA, ScoreB: scoreB})
    defer db.Close()
}

func dbDelete(id int) {
    db, err := gorm.Open("sqlite3", "engagement.sqlite3")
    if err != nil {
        fmt.Println("dbDelete: Can not open database")
    }

    var score Score
    db.First(&score, id)
    db.Delete(&score)
    db.Close()
}

func dbGetAll() []Score {
    db, err := gorm.Open("sqlite3", "engagement.sqlite3")
    if err != nil {
        fmt.Println("dbGetAll: Can not open database")
    }
    var scores []Score
    db.Order("created_at desc").Find(&scores)
    db.Close()
    return scores
}

type GopherInfo struct {
    ID string
    score int
}

var gophers = make(map[*melody.Session] *GopherInfo)

func main() {
    router := gin.Default()
    mrouter := melody.New()
    lock := new(sync.Mutex)
    counter := 0 //接続した順にIDが振られる

    dbInit()

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
        for _, info := range gophers {
            s.Write([]byte("set " + info.ID))
        }
        //ここで初期値の書き込み
        if counter > 2 {
            //TODO 怒る
        }
        counter++  //IDのインクリメント 1か2の値を取る
        gophers[s] = &GopherInfo{strconv.Itoa(counter), 0}
        s.Write([]byte("iam " + gophers[s].ID))
        lock.Unlock()
    })

    mrouter.HandleDisconnect(func(s *melody.Session) {
        lock.Lock()
        mrouter.BroadcastOthers([]byte("dis "+gophers[s].ID), s)
        //gophersのs番目削除
        delete(gophers, s)
        counter--
        lock.Unlock()
    })

  //ox oyはユーザーだけが知っとけばいい　必要な時だけ投げてくれって感じ
    mrouter.HandleMessage(func(s *melody.Session, msg []byte) {
        p := strings.Split(string(msg), " ")
        lock.Lock()
        if p[0] == "Draw" {
            info := gophers[s]
            mrouter.BroadcastOthers([]byte("set "+info.ID+" "+p[1]+" "+p[2]+" "+p[3]+" "+p[4]), s)
            info.score++
        } else {
            mrouter.BroadcastOthers(msg, s)
        }
        lock.Unlock()
    })

    go clearTimer(mrouter)

    router.Run(":5000")

}

func storeData() int{
    if len(gophers) > 2 {
        fmt.Println("Error: too much gophers")
    }

    //ソロはデータを入力しない
    if len(gophers) == 1{
        return 0
    }

    var arr[2] int

    n := 0
    for key, value := range gophers {
        arr[n] = value.score
        gophers[key].score = 0
        n++
    }

    dbInsert(arr[0], arr[1])
    return 0
}


func clearTimer(mrouter *melody.Melody) {
    for {
        /*
        time.Sleep(5 * time.Minute)
        mrouter.Broadcast([]byte("countDown 5"))
        time.Sleep(2 * time.Minute)
        mrouter.Broadcast([]byte("countDown 3"))
        time.Sleep(2 * time.Minute)
        mrouter.Broadcast([]byte("countDown 1"))
        */
        time.Sleep(55 * time.Second)
        mrouter.Broadcast([]byte("countDown 5"))
        time.Sleep(time.Second)
        mrouter.Broadcast([]byte("countDown 4"))
        time.Sleep(time.Second)
        mrouter.Broadcast([]byte("countDown 3"))
        time.Sleep(time.Second)
        mrouter.Broadcast([]byte("countDown 2"))
        time.Sleep(time.Second)
        mrouter.Broadcast([]byte("countDown 1"))

        time.Sleep(time.Second)
        storeData()
        mrouter.Broadcast([]byte("clear"))
        mrouter.Broadcast([]byte("countDown 10"))
    }
}
