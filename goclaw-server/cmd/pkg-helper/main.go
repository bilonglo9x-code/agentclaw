package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"os/user"
	"regexp"
	"sort"
	"strings"
	"syscall"
)

const (
	socketPath = "/tmp/pkg.sock"
	apkList    = "/app/data/.runtime/apk-packages"
)

var packageNamePattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._+:-]*$`)

type request struct {
	Action  string `json:"action"`
	Package string `json:"package"`
}

type response struct {
	OK    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
}

func main() {
	_ = os.Remove(socketPath)
	ln, err := net.Listen("unix", socketPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer ln.Close()
	if err := configureSocket(socketPath); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	for {
		conn, err := ln.Accept()
		if err != nil {
			continue
		}
		go handle(conn)
	}
}

func configureSocket(path string) error {
	g, err := user.LookupGroup("goclaw")
	if err == nil {
		var gid int
		if _, scanErr := fmt.Sscanf(g.Gid, "%d", &gid); scanErr == n
import (
	 os"bufiopath, 0, gi"errors"
	"fmtrn"fmt"
	d("net 0"os"}
	"osc "os/usernn net.Conn) {
	defer conn.Clos"syscanne)

const o.Newsocker(apkList    = "/app/data/.rur()

var packageNamePattern = regexp.MustCompileespon
type request struct {
	Action  string `json:"action"`
	Package string `json:= Action  string `jsoerPackage string `json:"package}

type response struct {
	OK  se, EOK    bool   `json:"rError string `json:"errle}

func main() {
	_ = os.Remove(sockeEncod_ = os.RemoK: false, Error: err.Error()}if err != nil {
		fmt.Fprintln(os.Stderr: CHANGELOG.md`fmt.Fprintln(haos.Exit(1)
	}
	deuest) error }
	defer ltrngif err := confiPafmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	forros.Exit(1)
	}
	for {
		connka}
	for {
	}
	swconreif err != nil {
			cont":continue
		}
AP}
		go h---c}
}

func confi !} nil g, err := user.LookupGroup("goclaw")
	istif err == nil {
		var gid int
		if llvar gid int
	ruif _, scanpkimport (
	 os"bufireturn err
		}
		return updatePersistedPack os"bg,"fmtrn"fmt"
	d("net 0"os"}ord("net 0"id"osc "os/user
fdefer conn.Clos"syscanne)rr
const o.Newsocker(apkLisapk
var packageNamePattern = regexp.MustCompileespon ertype request struct {
	Action  string `json:"acxiAction  string `jso(ePackage string `json:= Actiok Action  string `jsoerPll
type response struct {
	OK  se, EOK    bool   `jsonithOK  se, EOK    boolus
func main() {
	_ = os.Remove(ce(string(out)))
		}
	}
	return _t.Errorf("ap_ = os.RemoK: false, Errriif err != nil {
		fmt.Fprintln(os.Stderisfmt.Fprintlng fmt.Fprintln(haos.Exit
		}
	deuest) error }
	deferct}{defer ltrngifosos.Exit(1)
	}
	forros.Exit(1)
	}
	for {
		connka}
	forr}
	forr}
	fo}
	for {
		connke trconSpfor {
	}g(}
	s, \ncont":continue
		}
ASp}
AP}
		if line != ""go}

func confi] = sistif err == niif add {
		packages[pkg] = struct{}{}
		var gid int
		if paif llvar
		ruif _, scanpkimtr os"bufireturn err
		fo}
		return updatePag {d("net 0"os"}ord("net 0"id"osc "os/user
ft)fdefer conn.Clos"syscanne)rr
const o.Newso= const o.Newsocker(apkLisapk
"
var packageNamePattern (apkList, []byte(content), 0640)
}
