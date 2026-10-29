# instagram-top-videos-download (MCP)

Servidor MCP (Node.js, stdio) que lê a `lista.csv` gerada pelo MCP `instagram-videos` e baixa os vídeos mais curtidos da conta, **sem autenticação**.

## Ferramenta

`baixar_top_videos_instagram`

| parâmetro    | tipo   | descrição                                                                 |
|--------------|--------|---------------------------------------------------------------------------|
| `csv`        | string | caminho do CSV, absoluto ou relativo (ao diretório atual ou à raiz do projeto); também aceita a pasta que contém a `lista.csv` |
| `quantidade` | number | quantos vídeos baixar, começando pelos mais curtidos                      |

## Como funciona

1. Lê o CSV. A conta vem da coluna `conta`; se ela não existir, vem do nome da pasta do CSV.
2. Ordena por curtidas (`likes`, `curtidas` ou `like_count`), da maior para a menor. As visualizações não entram na ordenação.
3. Para cada um dos N primeiros `shortcode`:
   - `GET https://www.instagram.com/graphql/query?doc_id=10015901848480474&variables={"shortcode":"..."}` com headers de navegador (`x-ig-app-id: 936619743392459` e User-Agent de browser);
   - lê `data.xdt_shortcode_media.video_url` e baixa o `.mp4`.
4. Um erro de acesso ou de download num vídeo é registrado em `erros` e o processo segue para o próximo.

## Saída

Os arquivos vão para a pasta da conta: a pasta do CSV quando ela tem o nome da conta, senão `resources/videos/<conta>/`.

Nome: `<ordem>_<shortcode>.mp4`, onde a ordem é a posição no ranking de curtidas (`1_` é o mais curtido). Se um vídeo falhar, o número dele fica vago, sem renumerar os seguintes. Arquivos que já existem são mantidos e aparecem em `ja_existiam`.

## Uso

```bash
cd resources/mcps/instagram-top-videos-download
npm install
node src/cli.js ../../videos/natgeo/lista.csv 5
```

Registrado em `.mcp.json` na raiz do projeto como `instagram-top-videos-download`.
